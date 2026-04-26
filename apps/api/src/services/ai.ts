import OpenAI from 'openai';
import { TELANGANA_CONSTITUENCIES } from '../../../../data/seed/telangana-constituencies';
import { TELANGANA_ELECTION_HISTORY } from '../../../../data/seed/telangana-election-history';

const SYSTEM_PROMPT = `You are KSHETRA AI — an expert political analyst for Indian elections.
You have deep knowledge of Telangana state politics, assembly constituencies, and election data.

Current data available:
- Telangana: 119 assembly constituencies, 2023 election results
- Historical data: 2014, 2018, 2023 state-level results
- Party abbreviations: INC (Indian National Congress), BRS (Bharat Rashtra Samithi, formerly TRS), BJP (Bharatiya Janata Party), AIMIM (All India Majlis-e-Ittehadul Muslimeen), TDP (Telugu Desam Party)

2023 Results Summary:
- INC: 64 seats (returned to power after 9 years)
- BRS: 39 seats (lost power)
- BJP: 8 seats
- AIMIM: 7 seats (retained all Hyderabad seats)
- Others: 1 seat

Key facts:
- Telangana was formed in 2014, carved from Andhra Pradesh
- BRS (then TRS) won the first two elections (2014: 63 seats, 2018: 88 seats)
- 2023 saw a dramatic anti-incumbency wave against BRS
- Hyderabad is an AIMIM stronghold (Old City constituencies)
- Turnout: 64.23% (2023), 73.20% (2018), 69.16% (2014)

Guidelines:
- Be factual and cite specific numbers when available
- If asked about data you don't have, say so honestly
- Keep responses concise but informative
- Use Indian English conventions
- Format responses with bullet points for readability
- Do NOT fabricate per-constituency historical data for 2014/2018 (only state-level aggregates are available)`;

/** Build context string from constituency data for a specific query */
function buildConstituencyContext(acNo?: number): string {
  if (acNo) {
    const c = TELANGANA_CONSTITUENCIES.find((x) => x.acNo === acNo);
    if (c) {
      return `\nSpecific constituency context — AC #${c.acNo} ${c.name}:
- District: ${c.district}
- Type: ${c.type}
- 2023 Winner: ${c.winnerName2023} (${c.winner2023}) with ${c.winnerVotes2023.toLocaleString()} votes
- Runner-up: ${c.runnerUp2023}
- Margin: ${c.margin2023.toLocaleString()} votes`;
    }
  }
  return '';
}

/** Build election history context */
function buildHistoryContext(): string {
  return TELANGANA_ELECTION_HISTORY.map((e) => {
    const topParties = e.partyResults
      .sort((a, b) => b.seatsWon - a.seatsWon)
      .slice(0, 4)
      .map((p) => `${p.party}: ${p.seatsWon} seats`)
      .join(', ');
    return `${e.year}: ${topParties} | Turnout: ${e.turnout}%`;
  }).join('\n');
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatOptions {
  messages: ChatMessage[];
  constituencyAcNo?: number;
  stream?: boolean;
}

export async function chatWithAI(options: AIChatOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return 'AI features require an OpenAI API key. Set OPENAI_API_KEY in your environment variables to enable KSHETRA AI.';
  }

  const openai = new OpenAI({ apiKey });

  const contextualPrompt =
    SYSTEM_PROMPT +
    buildConstituencyContext(options.constituencyAcNo) +
    '\n\nElection History:\n' +
    buildHistoryContext();

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: contextualPrompt },
    ...options.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? 'No response generated.';
}

/** Generate quick analysis for a constituency */
export async function analyzeConstituency(acNo: number): Promise<string> {
  return chatWithAI({
    messages: [
      {
        role: 'user',
        content: `Give me a brief political analysis of this constituency. Cover: 1) 2023 result significance, 2) political dynamics, 3) key issues if known. Keep it to 3-4 bullet points.`,
      },
    ],
    constituencyAcNo: acNo,
  });
}

/** Generate election trend summary */
export async function analyzeElectionTrends(): Promise<string> {
  return chatWithAI({
    messages: [
      {
        role: 'user',
        content: `Summarize the key political trends across Telangana's 3 elections (2014, 2018, 2023). Focus on: 1) power shifts, 2) party performance trajectories, 3) turnout trends, 4) what the data suggests about voter behavior. Keep it concise with bullet points.`,
      },
    ],
  });
}
