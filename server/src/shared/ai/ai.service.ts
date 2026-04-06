import { AI } from "@/core/ai";
import { getModel, type KnownProvider } from "@mariozechner/pi-ai";
import { aiUsageModel, aiConversationModel } from "@/shared/ai/ai-usage.model";
import { env } from "@/core/env";
import type {
  ChatDTO,
  UsageQueryDTO,
  CreateConversationDTO,
  UpdateConversationDTO,
} from "@/shared/ai/ai.validation";
import { randomUUID } from "node:crypto";
import dayjs from "dayjs";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatOptions {
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;
}

export interface ChatResult {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxTokens: number;
  inputCapabilities: string[];
  reasoning: boolean;
}

export interface UsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byModel: Array<{
    provider: string;
    model: string;
    count: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}

// ── Service ──────────────────────────────────────────────────────────────────

class AIService {
  private defaultProvider = env.AI_DEFAULT_PROVIDER;
  private defaultModel = env.AI_DEFAULT_MODEL;
  private trackUsage = env.AI_TRACK_USAGE;
  private defaultTimeout = 60000; // 60 seconds

  /**
   * Non-streaming chat — returns the full response text.
   * Supports cancellation via AbortSignal.
   */
  async chat(input: ChatDTO, userId?: number, options?: ChatOptions): Promise<ChatResult> {
    const ai = this.createAI(input);
    const requestId = randomUUID();
    const timeout = options?.timeout ?? this.defaultTimeout;

    // Create AbortController with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine timeout signal with user-provided signal
    let signal = controller.signal;
    if (options?.signal) {
      // If user provides a signal, abort when either fires
      const userSignal = options.signal;
      const combinedController = new AbortController();

      userSignal.addEventListener("abort", () => combinedController.abort(userSignal.reason));
      controller.signal.addEventListener("abort", () =>
        combinedController.abort(controller.signal.reason),
      );

      signal = combinedController.signal;
    }

    try {
      const text = await ai.complete({
        prompt: input.message,
        systemPrompt: input.systemPrompt,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        signal,
      });

      if (this.trackUsage) {
        const provider = input.provider || this.defaultProvider;
        const model = input.model || this.defaultModel;
        const inputTokens = Math.ceil(input.message.length / 4);
        const outputTokens = Math.ceil(text.length / 4);

        await aiUsageModel.create({
          userId,
          provider,
          model,
          inputTokens,
          outputTokens,
          totalCost: this.estimateCost(provider, model, inputTokens, outputTokens),
          stopReason: "stop",
          requestId,
        });
      }

      return { text };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Streaming chat — returns an async generator of text deltas.
   * Supports cancellation via AbortSignal.
   */
  async *chatStream(
    input: ChatDTO,
    userId?: number,
    options?: ChatOptions,
  ): AsyncGenerator<string, void, undefined> {
    const ai = this.createAI(input);
    const requestId = randomUUID();
    const timeout = options?.timeout ?? this.defaultTimeout;
    let fullText = "";

    // Create AbortController with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine timeout signal with user-provided signal
    let signal = controller.signal;
    if (options?.signal) {
      const userSignal = options.signal;
      const combinedController = new AbortController();

      userSignal.addEventListener("abort", () => combinedController.abort(userSignal.reason));
      controller.signal.addEventListener("abort", () =>
        combinedController.abort(controller.signal.reason),
      );

      signal = combinedController.signal;
    }

    try {
      for await (const chunk of ai.stream({
        prompt: input.message,
        systemPrompt: input.systemPrompt,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        signal,
      })) {
        fullText += chunk;
        yield chunk;
      }

      if (this.trackUsage) {
        const provider = input.provider || this.defaultProvider;
        const model = input.model || this.defaultModel;
        const inputTokens = Math.ceil(input.message.length / 4);
        const outputTokens = Math.ceil(fullText.length / 4);

        await aiUsageModel.create({
          userId,
          provider,
          model,
          inputTokens,
          outputTokens,
          totalCost: this.estimateCost(provider, model, inputTokens, outputTokens),
          stopReason: "stop",
          requestId,
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get list of available models.
   */
  async getModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
    const providers = this.getAvailableProviders();

    for (const provider of providers) {
      const providerModels = this.getProviderModels(provider);
      for (const modelId of providerModels) {
        try {
          const model = getModel(provider as KnownProvider, modelId);
          models.push({
            id: modelId,
            name: this.getModelDisplayName(modelId),
            provider,
            contextWindow: model.contextWindow,
            maxTokens: model.maxTokens,
            inputCapabilities: model.input,
            reasoning: model.reasoning,
          });
        } catch {
          // Skip models that aren't available
        }
      }
    }

    return models;
  }

  /**
   * Get usage statistics.
   * Requires userId to prevent cross-user data exposure.
   */
  async getUsage(userId: number | undefined, params: UsageQueryDTO): Promise<UsageStats> {
    if (userId === undefined) {
      throw new Error("Authentication required for usage statistics");
    }

    const startDate = params.startDate
      ? dayjs(params.startDate).toDate()
      : dayjs().subtract(30, "day").toDate();
    const endDate = params.endDate ? dayjs(params.endDate).toDate() : dayjs().toDate();

    const [totalStats, groupedStats] = await Promise.all([
      aiUsageModel.getTotalStats(userId, startDate, endDate),
      aiUsageModel.getAggregatedStats(userId, startDate, endDate),
    ]);

    return {
      totalRequests: totalStats._count,
      totalInputTokens: totalStats._sum.inputTokens ?? 0,
      totalOutputTokens: totalStats._sum.outputTokens ?? 0,
      totalCost: Number(totalStats._sum.totalCost ?? 0),
      byModel: groupedStats.map((g) => ({
        provider: g.provider,
        model: g.model,
        count: g._count,
        inputTokens: g._sum.inputTokens ?? 0,
        outputTokens: g._sum.outputTokens ?? 0,
        cost: Number(g._sum.totalCost ?? 0),
      })),
    };
  }

  /**
   * Get detailed usage records.
   * Requires userId to prevent cross-user data exposure.
   */
  async getUsageRecords(userId: number | undefined, params: UsageQueryDTO) {
    if (userId === undefined) {
      throw new Error("Authentication required for usage records");
    }

    return aiUsageModel.findByUser({
      userId,
      startDate: params.startDate ? dayjs(params.startDate).toDate() : undefined,
      endDate: params.endDate ? dayjs(params.endDate).toDate() : undefined,
      provider: params.provider,
      model: params.model,
      limit: params.limit,
      offset: params.offset,
    });
  }

  // ── Conversation Management ────────────────────────────────────────────────

  async createConversation(data: CreateConversationDTO, userId?: number) {
    return aiConversationModel.create({
      userId,
      title: data.title,
      context: data.context as Record<string, unknown>,
      lastModel: data.lastModel,
    });
  }

  async getConversation(id: number, userId?: number) {
    return aiConversationModel.findById(id, userId);
  }

  async listConversations(userId: number | undefined, limit = 20, offset = 0) {
    if (userId === undefined) {
      throw new Error("Authentication required for listing conversations");
    }
    return aiConversationModel.findByUser(userId, limit, offset);
  }

  async updateConversation(id: number, data: UpdateConversationDTO, userId?: number) {
    // First verify ownership
    const existing = await aiConversationModel.findById(id, userId);
    if (!existing) {
      return null;
    }

    const updateData: Parameters<typeof aiConversationModel.update>[1] = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.context !== undefined) updateData.context = data.context as Record<string, unknown>;
    if (data.lastModel !== undefined) updateData.lastModel = data.lastModel;

    return aiConversationModel.update(id, updateData);
  }

  async deleteConversation(id: number, userId?: number) {
    // First verify ownership
    const existing = await aiConversationModel.findById(id, userId);
    if (!existing) {
      return null;
    }

    return aiConversationModel.delete(id);
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private createAI(input: ChatDTO): AI {
    return new AI({
      provider: input.provider || this.defaultProvider,
      model: input.model || this.defaultModel,
    });
  }

  private getAvailableProviders(): string[] {
    const providers: string[] = [];
    if (env.OPENAI_API_KEY) providers.push("openai");
    if (env.ANTHROPIC_API_KEY) providers.push("anthropic");
    if (env.GEMINI_API_KEY) providers.push("google");
    if (env.MISTRAL_API_KEY) providers.push("mistral");
    if (env.GROQ_API_KEY) providers.push("groq");
    if (env.XAI_API_KEY) providers.push("xai");
    if (env.OPENROUTER_API_KEY) providers.push("openrouter");
    return providers;
  }

  private getProviderModels(provider: string): string[] {
    const modelMap: Record<string, string[]> = {
      openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o1", "o3-mini"],
      anthropic: ["claude-3-7-sonnet", "claude-sonnet-4-20250514", "claude-3-5-haiku"],
      google: ["gemini-2.0-flash", "gemini-2.5-pro"],
      mistral: ["mistral-large-latest", "codestral-latest"],
      groq: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
      xai: ["grok-2-1212"],
      openrouter: ["anthropic/claude-sonnet-4"],
    };
    return modelMap[provider] ?? [];
  }

  private getModelDisplayName(modelId: string): string {
    const nameMap: Record<string, string> = {
      "gpt-4o-mini": "GPT-4o Mini",
      "gpt-4o": "GPT-4o",
      "gpt-4-turbo": "GPT-4 Turbo",
      o1: "o1",
      "o3-mini": "o3 Mini",
      "claude-3-7-sonnet": "Claude 3.7 Sonnet",
      "claude-sonnet-4-20250514": "Claude Sonnet 4",
      "claude-3-5-haiku": "Claude 3.5 Haiku",
      "gemini-2.0-flash": "Gemini 2.0 Flash",
      "gemini-2.5-pro": "Gemini 2.5 Pro",
    };
    return nameMap[modelId] ?? modelId;
  }

  private estimateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const costMap: Record<string, [number, number]> = {
      "gpt-4o-mini": [0.15, 0.6],
      "gpt-4o": [2.5, 10.0],
      "claude-3-7-sonnet": [3.0, 15.0],
      "claude-sonnet-4-20250514": [3.0, 15.0],
      "claude-3-5-haiku": [0.8, 4.0],
      "gemini-2.0-flash": [0.1, 0.4],
    };

    const key = model;
    const [inputCost, outputCost] = costMap[key] ?? [0.5, 1.5];
    return (inputTokens * inputCost + outputTokens * outputCost) / 1_000_000;
  }
}

export const aiService = new AIService();
