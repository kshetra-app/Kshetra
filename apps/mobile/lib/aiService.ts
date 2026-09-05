/**
 * Google Gemini AI Service — Connects to Google's Gemini API for intelligent political analysis.
 * Uses Google's high-speed native Generative Language API.
 */

import { supabase, isSupabaseConfigured } from './supabase';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const PRIMARY_MODEL = 'gemini-flash-lite-latest';
const FALLBACK_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
];

const SYSTEM_PROMPT = `You are KSHETRA AI — an expert political analyst specializing in Indian state assembly and parliamentary elections.

Your knowledge covers:
- All Indian state assembly elections (Vidhan Sabha) — results, margins, party performance, demographics
- Lok Sabha (Parliament) elections — MP profiles, party strength, coalition dynamics
- Delimitation — census-based seat projections, boundary changes, reservation (SC/ST) impacts
- Political parties — INC, BJP, BRS, AITC, DMK, CPIM, YSRCP, TDP, NCP, AAP and all regional parties
- Constituency-level data — current MLA, election history, margins, demographics, defections
- Candidate transparency — criminal cases, asset declarations, education backgrounds from affidavits

Guidelines:
- Be factual and cite specific data (constituency numbers, vote margins, percentages)
- When discussing projections, clearly state they are estimates based on Census 2011 data
- Provide balanced, non-partisan analysis
- Use Indian English conventions (lakh, crore, etc.)
- Keep responses concise but informative (200-400 words typically)
- If asked about a specific constituency, provide rich context: history, demographics, key issues`;

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  response: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: string;
}

/**
 * Check if AI is configured (API key present)
 */
export function isAIConfigured(): boolean {
  return GEMINI_API_KEY.length > 10;
}

/**
 * Send a chat completion request to Google Gemini API
 */
export async function sendAIChat(
  messages: AIChatMessage[],
  context?: { stateCode?: string; constituencyName?: string; acNo?: number },
): Promise<AIResponse> {
  if (!isAIConfigured()) {
    return {
      response: 'AI is not configured. Please add your Google Gemini API key to the environment variables.',
      model: 'none',
      error: 'NO_API_KEY',
    };
  }

  // Build context-enriched system prompt
  let systemPrompt = SYSTEM_PROMPT;
  if (context?.stateCode) {
    systemPrompt += `\n\nCurrent context: The user is viewing ${context.stateCode} state data.`;
  }
  if (context?.constituencyName && context?.acNo) {
    systemPrompt += ` Specifically constituency #${context.acNo} — ${context.constituencyName}.`;
  }

  // Format messages into Gemini's native contents schema
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  let lastError = '';
  let lastStatus = 0;

  for (const modelName of FALLBACK_MODELS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const startTime = Date.now();

    try {
      console.log(`[KSHETRA AI] Querying Gemini model: ${modelName}`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`[KSHETRA AI] Response received from ${modelName} in ${Date.now() - startTime}ms`);
          return {
            response: text,
            model: modelName,
            usage: data.usageMetadata
              ? {
                  prompt_tokens: data.usageMetadata.promptTokenCount ?? 0,
                  completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0,
                  total_tokens: data.usageMetadata.totalTokenCount ?? 0,
                }
              : undefined,
          };
        }
      }

      lastStatus = res.status;
      lastError = await res.text();
      console.warn(`[KSHETRA AI] Model ${modelName} error (${res.status}): ${lastError.slice(0, 150)}`);
      // Fall through to next model in chain
      continue;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err?.name === 'AbortError' ? 'Request timed out after 12s' : (err?.message ?? 'Network error');
      console.warn(`[KSHETRA AI] Model ${modelName} exception: ${lastError}`);
    }
  }

  return {
    response: lastStatus
      ? `AI service error (${lastStatus}). Please try again shortly.`
      : 'Unable to reach AI service. Please check your network connection.',
    model: PRIMARY_MODEL,
    error: lastError,
  };
}

/**
 * Fetches verified stored record for a constituency and its representative from Supabase.
 */
async function fetchVerifiedConstituencyData(stateCode: string, acNo: number, constituencyName: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: legislator } = await supabase
      .from('legislator_profiles')
      .select('full_name, display_name, current_party, constituency_name, constituency_number, state_code, education_level, attendance_percent, questions_asked, debates_participated, terms_served')
      .eq('state_code', stateCode)
      .eq('constituency_number', acNo)
      .maybeSingle();

    const { data: constituency } = await supabase
      .from('constituencies')
      .select('name, ac_no, district_name, reservation_type, total_electors, male_electors, female_electors')
      .eq('state_code', stateCode)
      .eq('ac_no', acNo)
      .maybeSingle();

    return {
      legislator: legislator || null,
      constituency: constituency || null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches verified state data from Supabase.
 */
async function fetchVerifiedStateData(stateCode: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: stateData } = await supabase
      .from('states')
      .select('code, name, total_seats, ruling_party, capital')
      .eq('code', stateCode)
      .maybeSingle();
    return stateData || null;
  } catch {
    return null;
  }
}

/**
 * Generate a retrieval-grounded factual analysis summary for a constituency.
 * Passes verified stored data directly into the model and strictly forbids hallucinating facts.
 */
export async function getConstituencyAnalysis(
  constituencyName: string,
  acNo: number,
  stateCode: string,
  currentMLA?: string,
  winningParty?: string,
  margin?: number,
): Promise<string> {
  const verified = await fetchVerifiedConstituencyData(stateCode, acNo, constituencyName);

  const verifiedFacts: Record<string, any> = {
    constituency: constituencyName,
    acNumber: acNo,
    state: stateCode,
    sittingMLA: currentMLA || verified?.legislator?.display_name || verified?.legislator?.full_name || null,
    party: winningParty || verified?.legislator?.current_party || null,
    victoryMargin: margin ? `${margin.toLocaleString()} votes` : null,
    district: verified?.constituency?.district_name || null,
    reservationCategory: verified?.constituency?.reservation_type || null,
    totalVoters: verified?.constituency?.total_electors ? verified.constituency.total_electors.toLocaleString() : null,
    assemblyAttendance: verified?.legislator?.attendance_percent ? `${verified.legislator.attendance_percent}%` : null,
    assemblyQuestions: verified?.legislator?.questions_asked ?? null,
    termsServed: verified?.legislator?.terms_served ?? null,
  };

  // If no verified record is available at all, return a factual absence statement
  const hasSubstantialData = verifiedFacts.sittingMLA || verifiedFacts.party || verifiedFacts.totalVoters;
  if (!hasSubstantialData) {
    return `Verified electoral records for ${constituencyName} (AC #${acNo}, ${stateCode}) are currently limited in the state database. Official verified MLA and demographic details will be displayed once confirmed by the Election Commission.`;
  }

  const prompt = `Using ONLY the following verified data in JSON format, write a concise, plain-language factual summary of ${constituencyName} (AC #${acNo}, ${stateCode}).

CRITICAL INSTRUCTIONS:
1. Do NOT add, invent, or speculate on any facts, voter turnout percentages, election trends, or unlisted opinions.
2. If any metric is null or unlisted in the JSON, do not estimate it; state that official verified data for that metric is not on file.
3. Keep the summary strictly objective, non-partisan, and under 130 words.

Verified Data:
${JSON.stringify(verifiedFacts, null, 2)}`;

  const result = await sendAIChat([{ role: 'user', content: prompt }], {
    stateCode,
    constituencyName,
    acNo,
  });

  // Post-generation validation: ensure output does not fabricate an unlisted MLA
  let output = result.response;
  if (verifiedFacts.sittingMLA && !output.toLowerCase().includes(verifiedFacts.sittingMLA.toLowerCase().split(' ')[0])) {
    output = `[Verified Representative: ${verifiedFacts.sittingMLA} (${verifiedFacts.party || 'Independent'})]\n${output}`;
  }

  return output;
}

/**
 * Generate a retrieval-grounded factual summary for a state.
 * Strictly forbids open-ended speculation or opinion generation.
 */
export async function getStateSummary(
  stateCode: string,
  stateName: string,
  totalSeats: number,
  rulingParty: string,
): Promise<string> {
  const verifiedState = await fetchVerifiedStateData(stateCode);

  const verifiedStateFacts = {
    stateName: verifiedState?.name || stateName,
    stateCode,
    totalAssemblySeats: verifiedState?.total_seats || totalSeats,
    currentRulingParty: verifiedState?.ruling_party || rulingParty,
    capital: verifiedState?.capital || null,
  };

  const prompt = `Using ONLY the following verified government data, write a concise summary of the official administrative and legislative structure of ${stateName}.

CRITICAL INSTRUCTIONS:
1. Do NOT predict upcoming election winners, opposition strength, speculative political challenges, or unverified opinions.
2. Rely strictly on the verified numbers and facts provided below.
3. Limit response to 90 words.

Verified Data:
${JSON.stringify(verifiedStateFacts, null, 2)}`;

  const result = await sendAIChat([{ role: 'user', content: prompt }], { stateCode });
  return result.response;
}

