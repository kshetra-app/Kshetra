/** Mobile AI requests use the authenticated platform API boundary. Provider
 * credentials, rate-card checks, budgets, and cost accounting stay server-side. */
import { apiClient } from './api';

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  response: string;
  groundingStatus: 'reference_data_unverified';
}

export async function sendAIChat(
  messages: AIChatMessage[],
  context?: { stateCode?: string; constituencyName?: string; acNo?: number },
): Promise<AIResponse> {
  const data = await apiClient.ai.chat({
    messages: messages
      .filter((message): message is AIChatMessage & { role: 'user' | 'assistant' } => message.role !== 'system')
      .map(({ role, content }) => ({ role, content })),
    constituencyAcNo: context?.acNo,
    stateCode: context?.stateCode,
  });
  return {
    response: data.response,
    groundingStatus: data.groundingStatus,
  };
}

/** Fetch constituency analysis through the server-side budgeted AI adapter. */
export async function getConstituencyAnalysis(
  constituencyName: string,
  acNo: number,
  stateCode: string,
  _currentMLA?: string,
  _winningParty?: string,
  _margin?: number,
): Promise<string> {
  const result = await apiClient.ai.analyzeConstituency(acNo, stateCode);
  return `Source note: This answer uses bundled reference data without per-record source and date verification.\n\n${result.analysis}`;
}

/** Summarize explicitly labelled app reference values without claiming verification. */
export async function getStateSummary(
  stateCode: string,
  stateName: string,
  totalSeats: number,
  rulingParty: string,
): Promise<string> {
  const prompt = `Summarize these app-supplied reference values for ${stateName} (${stateCode}) in no more than 90 words. The values do not have per-record source/date verification attached. Do not call them official, verified, or current; do not add facts not listed.\nState name: ${stateName}\nAssembly seat count: ${totalSeats}\nRuling-party label: ${rulingParty}`;
  const result = await sendAIChat([{ role: 'user', content: prompt }], { stateCode });
  return `Source note: This answer uses app-supplied reference values without per-record source and date verification.\n\n${result.response}`;
}

