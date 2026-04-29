import OpenAI from 'openai';
import { TELANGANA_CONSTITUENCIES } from '../../../../data/seed/telangana-constituencies';
import { TELANGANA_ELECTION_HISTORY } from '../../../../data/seed/telangana-election-history';
import { getMLAProfile } from '../../../../data/seed/telangana-mla-profiles';
import { getConstituencyDemographics } from '../../../../data/seed/telangana-demographics';
import { getConstituencyHistory, isPartyStronghold } from '../../../../data/seed/telangana-historical-results';
import { getConstituencyTimeline, getDefectionSummary, computePartyStrength } from '../../../../data/seed/telangana-political-timeline';

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
- You now have per-constituency historical data for 2014, 2018, 2023 elections
- You have MLA profiles, demographics, and political timeline data
- Use all available data to provide rich, factual analysis`;

/** Build rich context string from all data sources for a specific constituency */
function buildConstituencyContext(acNo?: number): string {
  if (!acNo) return '';

  const c = TELANGANA_CONSTITUENCIES.find((x) => x.acNo === acNo);
  if (!c) return '';

  let ctx = `\n\n=== CONSTITUENCY CONTEXT: AC #${c.acNo} ${c.name} ===`;
  ctx += `\nDistrict: ${c.district} | Type: ${c.type}`;
  ctx += `\n2023 Winner: ${c.winnerName2023} (${c.winner2023}) — ${c.winnerVotes2023.toLocaleString()} votes`;
  ctx += `\nRunner-up: ${c.runnerUp2023} | Margin: ${c.margin2023.toLocaleString()} votes`;

  if (c.winner2023 !== c.currentParty) {
    ctx += `\nDEFECTION: Elected as ${c.winner2023}, currently with ${c.currentParty}`;
  }

  // Historical results
  const history = getConstituencyHistory(c.acNo);
  if (history.ac2014) ctx += `\n2014: ${history.ac2014.winner} (${history.ac2014.party})`;
  if (history.ac2018) ctx += `\n2018: ${history.ac2018.winner} (${history.ac2018.party})`;

  const stronghold = isPartyStronghold(c.acNo, c.winner2023);
  if (stronghold) ctx += `\nSTRONGHOLD: Same party won all 3 elections`;

  // MLA profile
  const mla = getMLAProfile(c.acNo);
  if (mla) {
    ctx += `\nMLA: ${mla.name} (${mla.party}), Gender: ${mla.gender}, Terms: ${mla.terms}`;
    if (mla.education) ctx += `, Education: ${mla.education}`;
    if (mla.age) ctx += `, Age: ${mla.age}`;
  }

  // Demographics
  const demo = getConstituencyDemographics(c.acNo);
  if (demo) {
    ctx += `\nPopulation: ${demo.population.toLocaleString()}, Literacy: ${demo.literacy}%`;
    ctx += `, Turnout 2023: ${demo.turnout2023}%, Urban: ${demo.urbanPercent}%`;
    ctx += `, Voters: ${demo.totalVoters.toLocaleString()}`;
  }

  // Political timeline events for this AC
  const timeline = getConstituencyTimeline(c.acNo);
  if (timeline.length > 0) {
    ctx += `\nPolitical events:`;
    for (const ev of timeline.slice(0, 5)) {
      ctx += `\n  - ${ev.date}: ${ev.explanation}`;
    }
  }

  return ctx;
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
        content: `Give me a comprehensive political analysis of this constituency. Cover: 1) 2023 result significance and margin analysis, 2) historical voting patterns across 2014/2018/2023, 3) MLA profile and political dynamics, 4) demographic factors that may influence politics, 5) any defections or notable political events. Keep each point concise (1-2 sentences).`,
      },
    ],
    constituencyAcNo: acNo,
  });
}

/** Generate election trend summary */
export async function analyzeElectionTrends(): Promise<string> {
  // Inject current party strength and defection summary
  const strength = computePartyStrength();
  const defections = getDefectionSummary();
  let extraCtx = '\n\nCurrent Party Strength (post-defections):';
  const partyKeys = Object.keys(strength.parties).sort((a, b) => strength.parties[b] - strength.parties[a]);
  for (const party of partyKeys) {
    const seats = strength.parties[party];
    if (seats > 0) extraCtx += `\n  ${party}: ${seats}`;
  }
  const defectionKeys = Object.keys(defections);
  if (defectionKeys.length > 0) {
    extraCtx += '\n\nDefection Summary:';
    for (const key of defectionKeys) {
      extraCtx += `\n  ${key}: ${defections[key]} MLAs`;
    }
  }

  return chatWithAI({
    messages: [
      {
        role: 'user',
        content: `Summarize the key political trends across Telangana's 3 elections (2014, 2018, 2023). Cover: 1) power shifts and anti-incumbency patterns, 2) party performance trajectories, 3) turnout trends, 4) post-election defections and their impact on governance, 5) what the data suggests about voter behavior. Use the defection data provided. Keep it concise with bullet points.${extraCtx}`,
      },
    ],
  });
}

/** Natural language constituency search — find constituency matching a query */
export async function smartSearch(query: string): Promise<{ acNo: number; name: string; reason: string }[]> {
  // Build a compact constituency index for the AI
  const index = TELANGANA_CONSTITUENCIES.map((c) => {
    const mla = getMLAProfile(c.acNo);
    return `${c.acNo}|${c.name}|${c.district}|${c.winner2023}|${c.winnerName2023}|${mla?.name ?? ''}|${c.type}`;
  }).join('\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a Telangana constituency search engine. Given a natural language query and a pipe-delimited index (acNo|name|district|party|winnerName|mlaName|type), return a JSON array of up to 5 matching constituencies with {acNo, name, reason}. The reason should explain why this constituency matches the query in 10 words or less. Return ONLY valid JSON array, no markdown.\n\nIndex:\n${index}`,
      },
      { role: 'user', content: query },
    ],
    max_tokens: 512,
    temperature: 0,
  });

  try {
    const raw = completion.choices[0]?.message?.content ?? '[]';
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

/** Generate AI summary for civic issues in a constituency */
export async function summarizeIssues(constituencyName: string, issues: string[]): Promise<string> {
  if (issues.length === 0) return 'No civic issues reported in this constituency yet.';

  return chatWithAI({
    messages: [
      {
        role: 'user',
        content: `Summarize the civic issues in ${constituencyName} constituency. The reported issues are:\n${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nProvide: 1) Overall assessment (1 sentence), 2) Top priority (1 sentence), 3) Governance implication (1 sentence). Keep it to exactly 3 bullet points.`,
      },
    ],
  });
}
