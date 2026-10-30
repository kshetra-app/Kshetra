/**
 * POLIGRAM / KSHETRA PLATFORM
 * Domain 8: AI Provider Abstraction (JOB 067)
 * Pluggable 4-tier provider cascade with dynamic registration, zero hardcoding,
 * and deterministic offline startup guarantees.
 */

import OpenAI from 'openai';
import type {
  AIProviderType,
  AIProviderConfig,
  AICompletionRequest,
  AICompletionResponse,
} from '@kshetra/shared';

export interface IAIProvider {
  name: AIProviderType;
  isAvailable(): boolean;
  generateCompletion(req: AICompletionRequest): Promise<AICompletionResponse>;
}

const USD_TO_INR_RATE = 86.5;

/** Tier 1: Gemini Provider (Default Google Gemini 2.0 Flash) */
export class GeminiAIProvider implements IAIProvider {
  public name: AIProviderType = 'gemini';
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private client: OpenAI | null = null;

  constructor(options?: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = options?.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.baseUrl =
      options?.baseUrl ||
      process.env.GEMINI_BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta/openai';

    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });
    }
  }

  public isAvailable(): boolean {
    return !!this.apiKey && !!this.client;
  }

  public async generateCompletion(req: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.client) {
      throw new Error('GeminiAIProvider is not configured with an API key.');
    }

    const startTime = Date.now();
    const messages: OpenAI.ChatCompletionMessageParam[] = req.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.maxTokens ?? 1024,
    });

    const latencyMs = Date.now() - startTime;
    const content = response.choices[0]?.message?.content ?? '';
    const promptTokens = response.usage?.prompt_tokens ?? Math.ceil(req.messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const completionTokens = response.usage?.completion_tokens ?? Math.ceil(content.length / 4);
    const totalTokens = promptTokens + completionTokens;

    // Gemini 2.0 Flash pricing: $0.10 / 1M prompt, $0.40 / 1M completion
    const costUsd = (promptTokens * 0.0000001) + (completionTokens * 0.0000004);
    const costInr = costUsd * USD_TO_INR_RATE;

    return {
      content,
      provider: 'gemini',
      model: this.model,
      usage: { promptTokens, completionTokens, totalTokens },
      costUsd: Number(costUsd.toFixed(6)),
      costInr: Number(costInr.toFixed(4)),
      latencyMs,
      degradedOffline: false,
    };
  }
}

/** Tier 2: OpenAI Provider (Default GPT-4o-mini) */
export class OpenAIProvider implements IAIProvider {
  public name: AIProviderType = 'openai';
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private client: OpenAI | null = null;

  constructor(options?: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey = options?.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = options?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.baseUrl = options?.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });
    }
  }

  public isAvailable(): boolean {
    return !!this.apiKey && !!this.client;
  }

  public async generateCompletion(req: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.client) {
      throw new Error('OpenAIProvider is not configured with an API key.');
    }

    const startTime = Date.now();
    const messages: OpenAI.ChatCompletionMessageParam[] = req.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.maxTokens ?? 1024,
    });

    const latencyMs = Date.now() - startTime;
    const content = response.choices[0]?.message?.content ?? '';
    const promptTokens = response.usage?.prompt_tokens ?? Math.ceil(req.messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const completionTokens = response.usage?.completion_tokens ?? Math.ceil(content.length / 4);
    const totalTokens = promptTokens + completionTokens;

    // GPT-4o-mini pricing: $0.15 / 1M prompt, $0.60 / 1M completion
    const costUsd = (promptTokens * 0.00000015) + (completionTokens * 0.0000006);
    const costInr = costUsd * USD_TO_INR_RATE;

    return {
      content,
      provider: 'openai',
      model: this.model,
      usage: { promptTokens, completionTokens, totalTokens },
      costUsd: Number(costUsd.toFixed(6)),
      costInr: Number(costInr.toFixed(4)),
      latencyMs,
      degradedOffline: false,
    };
  }
}

/** Tier 3: Custom LLM Service Provider (Zero Hardcoding: Configurable BaseURL, Auth, Model) */
export class CustomLLMProvider implements IAIProvider {
  public name: AIProviderType = 'custom';
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private headerName: string;

  constructor(options?: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    headerName?: string;
  }) {
    this.baseUrl = options?.baseUrl || process.env.CUSTOM_LLM_BASE_URL || '';
    this.apiKey = options?.apiKey || process.env.CUSTOM_LLM_API_KEY || '';
    this.model = options?.model || process.env.CUSTOM_LLM_MODEL || 'custom-civic-llm';
    this.headerName = options?.headerName || process.env.CUSTOM_LLM_HEADER_NAME || 'Authorization';
  }

  public isAvailable(): boolean {
    return !!this.baseUrl;
  }

  public async generateCompletion(req: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.baseUrl) {
      throw new Error('CustomLLMProvider requires a valid baseUrl.');
    }

    const startTime = Date.now();
    const endpoint = this.baseUrl.endsWith('/chat/completions')
      ? this.baseUrl
      : `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers[this.headerName] = this.headerName.toLowerCase() === 'authorization' && !this.apiKey.startsWith('Bearer ')
        ? `Bearer ${this.apiKey}`
        : this.apiKey;
    }

    const body = {
      model: this.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.maxTokens ?? 1024,
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`CustomLLMProvider HTTP ${res.status}: ${errText}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const latencyMs = Date.now() - startTime;
    const content = json.choices?.[0]?.message?.content ?? '';
    const promptTokens = json.usage?.prompt_tokens ?? Math.ceil(req.messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const completionTokens = json.usage?.completion_tokens ?? Math.ceil(content.length / 4);
    const totalTokens = promptTokens + completionTokens;

    // Custom LLM nominal cost: $0.05 / 1M prompt, $0.15 / 1M completion
    const costUsd = (promptTokens * 0.00000005) + (completionTokens * 0.00000015);
    const costInr = costUsd * USD_TO_INR_RATE;

    return {
      content,
      provider: 'custom',
      model: this.model,
      usage: { promptTokens, completionTokens, totalTokens },
      costUsd: Number(costUsd.toFixed(6)),
      costInr: Number(costInr.toFixed(4)),
      latencyMs,
      degradedOffline: false,
    };
  }
}

/** Tier 4: Deterministic Offline Heuristic Provider (Guarantees Zero Startup Crash & Offline Integrity) */
export class DeterministicOfflineAIProvider implements IAIProvider {
  public name: AIProviderType = 'offline_heuristic';
  public model = 'deterministic-offline-v1';

  public isAvailable(): boolean {
    return true; // Always available
  }

  public async generateCompletion(req: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const userMessage = [...req.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const systemMessage = req.messages.find((m) => m.role === 'system')?.content || '';

    let content = '';

    // Handle JSON format requests deterministically
    if (req.responseFormat === 'json' || systemMessage.toLowerCase().includes('json')) {
      if (userMessage.toLowerCase().includes('summarize') || systemMessage.toLowerCase().includes('summary')) {
        content = JSON.stringify({
          bullets: [
            'Official legislative notification published under public gazette records.',
            'Constituency representatives reviewed territorial allocations and civic priorities.',
            'Statutory implementation scheduled under standard municipal administrative guidelines.'
          ],
          sentiment: 'neutral',
          entities: ['Election Commission', 'District Administration']
        });
      } else {
        content = JSON.stringify({
          status: 'success',
          classification: 'civic_administrative',
          confidence: 0.90,
          provider: 'offline_heuristic'
        });
      }
    } else {
      // Deterministic structured text generation
      const lines = userMessage
        .split(/[.\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);

      const bullet1 = lines[0] || 'Official civic documentation processed under verified records.';
      const bullet2 = lines[1] || 'Public administration proceedings follow statutory territorial guidelines.';
      const bullet3 = lines[2] || 'Citizens can track updates through verified local constituency registers.';

      content = `• ${bullet1}\n• ${bullet2}\n• ${bullet3}`;
    }

    const latencyMs = Math.max(1, Date.now() - startTime);
    const promptTokens = Math.ceil((userMessage.length + systemMessage.length) / 4);
    const completionTokens = Math.ceil(content.length / 4);
    const totalTokens = promptTokens + completionTokens;

    return {
      content,
      provider: 'offline_heuristic',
      model: this.model,
      usage: { promptTokens, completionTokens, totalTokens },
      costUsd: 0,
      costInr: 0,
      latencyMs,
      degradedOffline: true,
    };
  }
}

/** Dynamic AI Provider Registry & Fallback Cascade (Zero Hardcoding) */
export class AIProviderRegistry {
  private providers: Map<AIProviderType, IAIProvider> = new Map();
  private priorityOrder: AIProviderType[] = ['gemini', 'openai', 'custom', 'offline_heuristic'];

  constructor() {
    this.registerProvider(new GeminiAIProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new CustomLLMProvider());
    this.registerProvider(new DeterministicOfflineAIProvider());
  }

  public registerProvider(provider: IAIProvider, priority?: number): void {
    this.providers.set(provider.name, provider);
    if (priority !== undefined) {
      this.priorityOrder = this.priorityOrder.filter((p) => p !== provider.name);
      this.priorityOrder.splice(priority, 0, provider.name);
    }
  }

  public resetForTesting(): void {
    this.providers.clear();
    this.priorityOrder = ['gemini', 'openai', 'custom', 'offline_heuristic'];
    this.registerProvider(new GeminiAIProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new CustomLLMProvider());
    this.registerProvider(new DeterministicOfflineAIProvider());
  }

  public getProvider(name: AIProviderType): IAIProvider | undefined {
    return this.providers.get(name);
  }

  public configure(options: {
    priorityOrder?: AIProviderType[];
    customConfig?: { baseUrl: string; apiKey?: string; model?: string; headerName?: string };
  }): void {
    if (options.priorityOrder && options.priorityOrder.length > 0) {
      this.priorityOrder = options.priorityOrder;
    }
    if (options.customConfig) {
      this.registerProvider(new CustomLLMProvider(options.customConfig));
    }
  }

  public getActiveChain(): IAIProvider[] {
    const chain: IAIProvider[] = [];
    for (const type of this.priorityOrder) {
      const p = this.providers.get(type);
      if (p && p.isAvailable()) {
        chain.push(p);
      }
    }
    // Guarantee offline fallback is always present at tail
    if (!chain.some((p) => p.name === 'offline_heuristic')) {
      const offline = this.providers.get('offline_heuristic') || new DeterministicOfflineAIProvider();
      chain.push(offline);
    }
    return chain;
  }

  /** Execute request against provider cascade with automatic failover */
  public async generateWithFallback(
    req: AICompletionRequest,
    logger?: { warn: (obj: unknown, msg: string) => void },
  ): Promise<AICompletionResponse> {
    const chain = this.getActiveChain();
    let lastError: Error | null = null;

    for (const provider of chain) {
      try {
        const response = await provider.generateCompletion(req);
        return response;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (logger) {
          logger.warn(
            { provider: provider.name, error: lastError.message },
            `AI provider ${provider.name} failed, cascading to next tier`,
          );
        }
      }
    }

    // Fail-safe: execute deterministic offline provider directly
    const offline = new DeterministicOfflineAIProvider();
    return offline.generateCompletion(req);
  }
}

/** Global default provider registry instance */
export const defaultAIRegistry = new AIProviderRegistry();
