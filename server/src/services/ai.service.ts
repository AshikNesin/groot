import { AI } from "@/core/ai";
import { getModel, type KnownProvider } from "@mariozechner/pi-ai";
import { aiUsageModel, aiConversationModel } from "@/models/ai-usage.model";
import { env } from "@/env";
import type {
  ChatDTO,
  UsageQueryDTO,
  CreateConversationDTO,
  UpdateConversationDTO,
} from "@/validations/ai.validation";
import { randomUUID } from "node:crypto";

// ── Types ────────────────────────────────────────────────────────────────────

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

  /**
   * Non-streaming chat — returns the full response text.
   */
  async chat(input: ChatDTO, userId?: number): Promise<ChatResult> {
    const ai = this.createAI(input);
    const requestId = randomUUID();

    const text = await ai.complete(input.message, {
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
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
  }

  /**
   * Streaming chat — returns an async generator of text deltas.
   */
  async *chatStream(
    input: ChatDTO,
    userId?: number,
  ): AsyncGenerator<string, void, undefined> {
    const ai = this.createAI(input);
    const requestId = randomUUID();
    let fullText = "";

    for await (const chunk of ai.stream(input.message, {
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
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
   */
  async getUsage(
    userId: number | undefined,
    params: UsageQueryDTO,
  ): Promise<UsageStats> {
    const startDate = params.startDate
      ? new Date(params.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = params.endDate ? new Date(params.endDate) : new Date();

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
   */
  async getUsageRecords(userId: number | undefined, params: UsageQueryDTO) {
    return aiUsageModel.findByUser({
      userId,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
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
    return aiConversationModel.findByUser(userId, limit, offset);
  }

  async updateConversation(id: number, data: UpdateConversationDTO) {
    const updateData: Parameters<typeof aiConversationModel.update>[1] = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.context !== undefined)
      updateData.context = data.context as Record<string, unknown>;
    if (data.lastModel !== undefined) updateData.lastModel = data.lastModel;

    return aiConversationModel.update(id, updateData);
  }

  async deleteConversation(id: number) {
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
      anthropic: [
        "claude-3-7-sonnet",
        "claude-sonnet-4-20250514",
        "claude-3-5-haiku",
      ],
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
