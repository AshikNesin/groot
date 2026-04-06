import { AI } from "@/core/ai";
import { getModel, type KnownProvider } from "@mariozechner/pi-ai";
import { aiUsageModel, aiConversationModel } from "./ai-usage.model";
import { env } from "@/core/env";
import type {
  ChatDTO,
  UsageQueryDTO,
  CreateConversationDTO,
  UpdateConversationDTO,
} from "./ai.validation";
import { randomUUID } from "node:crypto";
import dayjs from "dayjs";

export interface ChatOptions {
  signal?: AbortSignal;
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

const defaultProvider = env.AI_DEFAULT_PROVIDER;
const defaultModel = env.AI_DEFAULT_MODEL;
const trackUsage = env.AI_TRACK_USAGE;
const defaultTimeout = 60000;

function createAI(input: ChatDTO): AI {
  return new AI({
    provider: input.provider || defaultProvider,
    model: input.model || defaultModel,
  });
}

function getAvailableProviders(): string[] {
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

function getProviderModels(provider: string): string[] {
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

function getModelDisplayName(modelId: string): string {
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

function estimateCost(
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

export async function chat({
  input,
  userId,
  options,
}: {
  input: ChatDTO;
  userId?: number;
  options?: ChatOptions;
}): Promise<ChatResult> {
  const aiInstance = createAI(input);
  const requestId = randomUUID();
  const timeout = options?.timeout ?? defaultTimeout;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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
    const text = await aiInstance.complete({
      prompt: input.message,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      signal,
    });

    if (trackUsage) {
      const provider = input.provider || defaultProvider;
      const model = input.model || defaultModel;
      const inputTokens = Math.ceil(input.message.length / 4);
      const outputTokens = Math.ceil(text.length / 4);

      await aiUsageModel.create({
        userId,
        provider,
        model,
        inputTokens,
        outputTokens,
        totalCost: estimateCost(provider, model, inputTokens, outputTokens),
        stopReason: "stop",
        requestId,
      });
    }

    return { text };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function* chatStream({
  input,
  userId,
  options,
}: {
  input: ChatDTO;
  userId?: number;
  options?: ChatOptions;
}): AsyncGenerator<string, void, undefined> {
  const aiInstance = createAI(input);
  const requestId = randomUUID();
  const timeout = options?.timeout ?? defaultTimeout;
  let fullText = "";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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
    for await (const chunk of aiInstance.stream({
      prompt: input.message,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      signal,
    })) {
      fullText += chunk;
      yield chunk;
    }

    if (trackUsage) {
      const provider = input.provider || defaultProvider;
      const model = input.model || defaultModel;
      const inputTokens = Math.ceil(input.message.length / 4);
      const outputTokens = Math.ceil(fullText.length / 4);

      await aiUsageModel.create({
        userId,
        provider,
        model,
        inputTokens,
        outputTokens,
        totalCost: estimateCost(provider, model, inputTokens, outputTokens),
        stopReason: "stop",
        requestId,
      });
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getModels(): Promise<ModelInfo[]> {
  const models: ModelInfo[] = [];
  const providers = getAvailableProviders();

  for (const provider of providers) {
    const providerModels = getProviderModels(provider);
    for (const modelId of providerModels) {
      try {
        const model = getModel(provider as KnownProvider, modelId);
        models.push({
          id: modelId,
          name: getModelDisplayName(modelId),
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

export async function getUsage({
  userId,
  params,
}: {
  userId?: number;
  params: UsageQueryDTO;
}): Promise<UsageStats> {
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

export async function getUsageRecords({
  userId,
  params,
}: {
  userId?: number;
  params: UsageQueryDTO;
}) {
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

export async function createConversation({
  data,
  userId,
}: {
  data: CreateConversationDTO;
  userId?: number;
}) {
  return aiConversationModel.create({
    userId,
    title: data.title,
    context: data.context as Record<string, unknown>,
    lastModel: data.lastModel,
  });
}

export async function getConversation({ id, userId }: { id: number; userId?: number }) {
  return aiConversationModel.findById(id, userId);
}

export async function listConversations({
  userId,
  limit = 20,
  offset = 0,
}: {
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  if (userId === undefined) {
    throw new Error("Authentication required for listing conversations");
  }
  return aiConversationModel.findByUser(userId, limit, offset);
}

export async function updateConversation({
  id,
  data,
  userId,
}: {
  id: number;
  data: UpdateConversationDTO;
  userId?: number;
}) {
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

export async function deleteConversation({ id, userId }: { id: number; userId?: number }) {
  const existing = await aiConversationModel.findById(id, userId);
  if (!existing) {
    return null;
  }

  return aiConversationModel.delete(id);
}
