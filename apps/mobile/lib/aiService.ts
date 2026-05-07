/**
 * Groq AI Service — Connects to Groq's ultra-fast LLM API for intelligent political analysis.
 * Uses the Groq API (OpenAI-compatible endpoint) for chat completions.
 */

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROK_API_KEY || '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

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
  return GROQ_API_KEY.length > 10;
}

/**
 * Send a chat completion request to Grok API
 */
export async function sendAIChat(
  messages: AIChatMessage[],
  context?: { stateCode?: string; constituencyName?: string; acNo?: number },
): Promise<AIResponse> {
  if (!isAIConfigured()) {
    return {
      response: 'AI is not configured. Please add your Grok API key to the environment variables.',
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

  const fullMessages: AIChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        response: `AI service error (${res.status}). Please try again later.`,
        model: MODEL,
        error: errText,
      };
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    return {
      response: choice?.message?.content ?? 'No response generated.',
      model: data.model ?? MODEL,
      usage: data.usage,
    };
  } catch (err: any) {
    return {
      response: 'Unable to reach AI service. Please check your internet connection.',
      model: MODEL,
      error: err?.message ?? 'Network error',
    };
  }
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
