/**
 * Google Gemini AI Service — Connects to Google's Gemini API for intelligent political analysis.
 * Uses Google's high-speed native Generative Language API.
 */

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
 * Generate a quick analysis summary for a constituency
 */
export async function getConstituencyAnalysis(
  constituencyName: string,
  acNo: number,
  stateCode: string,
  currentMLA?: string,
  winningParty?: string,
  margin?: number,
): Promise<string> {
  const prompt = `Give a brief political analysis of ${constituencyName} (AC #${acNo}) in ${stateCode}.${
    currentMLA ? ` Current MLA: ${currentMLA} (${winningParty}).` : ''
  }${margin ? ` Won by margin of ${margin.toLocaleString()} votes.` : ''} Cover: political significance, demographics, key issues, and election trends in 150 words.`;

  const result = await sendAIChat([{ role: 'user', content: prompt }], {
    stateCode,
    constituencyName,
    acNo,
  });

  return result.response;
}

/**
 * Generate a dashboard summary for a state
 */
export async function getStateSummary(
  stateCode: string,
  stateName: string,
  totalSeats: number,
  rulingParty: string,
): Promise<string> {
  const prompt = `In 100 words, summarize the current political landscape of ${stateName} (${totalSeats} assembly seats, ruling party: ${rulingParty}). Include recent trends, opposition strength, and key upcoming challenges.`;

  const result = await sendAIChat([{ role: 'user', content: prompt }], { stateCode });
  return result.response;
}
