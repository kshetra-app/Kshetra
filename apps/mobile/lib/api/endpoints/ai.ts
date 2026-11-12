import { ApiValidationError } from '../errors';
import type { ApiClient } from '../client';

export interface AIChatMessageDTO {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatRequestDTO {
  messages: AIChatMessageDTO[];
  constituencyAcNo?: number;
  stateCode?: string;
}

export interface AIChatResponseDTO {
  response: string;
  groundingStatus: 'reference_data_unverified';
}

export interface AIConstituencyAnalysisResponseDTO {
  acNo: number;
  stateCode: string;
  analysis: string;
  groundingStatus: 'reference_data_unverified';
}

function validateAIChatResponse(data: unknown): AIChatResponseDTO {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError('Invalid AI response: expected an object payload');
  }
  const payload = data as Record<string, unknown>;
  if (typeof payload.response !== 'string' || !payload.response.trim()) {
    throw new ApiValidationError('Invalid AI response: missing response text');
  }
  if (payload.groundingStatus !== 'reference_data_unverified') {
    throw new ApiValidationError('Invalid AI response: missing reference-data provenance status');
  }
  return {
    response: payload.response,
    groundingStatus: 'reference_data_unverified',
  };
}

export class AIEndpoint {
  constructor(private readonly client: ApiClient) {}

  async chat(request: AIChatRequestDTO): Promise<AIChatResponseDTO> {
    const { data } = await this.client.post<unknown, AIChatRequestDTO>('/api/v1/ai/chat', request, {
      authPolicy: 'authenticated',
      timeoutMs: 45_000,
      totalBudgetMs: 50_000,
      retries: 0,
    });
    return validateAIChatResponse(data);
  }

  async analyzeConstituency(acNo: number, stateCode: string): Promise<AIConstituencyAnalysisResponseDTO> {
    const { data } = await this.client.get<unknown>(`/api/v1/ai/analyze/constituency/${acNo}`, {
      authPolicy: 'authenticated',
      query: { stateCode },
      timeoutMs: 45_000,
      totalBudgetMs: 50_000,
      retries: 0,
    });
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new ApiValidationError('Invalid constituency AI response: expected an object payload');
    }
    const payload = data as Record<string, unknown>;
    if (typeof payload.analysis !== 'string' || !payload.analysis.trim() || payload.groundingStatus !== 'reference_data_unverified') {
      throw new ApiValidationError('Invalid constituency AI response: missing analysis or provenance status');
    }
    return {
      acNo: typeof payload.acNo === 'number' ? payload.acNo : acNo,
      stateCode: typeof payload.stateCode === 'string' ? payload.stateCode : stateCode,
      analysis: payload.analysis,
      groundingStatus: 'reference_data_unverified',
    };
  }
}
