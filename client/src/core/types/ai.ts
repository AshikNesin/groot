// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  stream?: boolean;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

// ── Models ───────────────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxTokens: number;
  inputCapabilities: string[];
  reasoning: boolean;
}

// ── Usage ────────────────────────────────────────────────────────────────────

export interface UsageQuery {
  startDate?: string;
  endDate?: string;
  provider?: string;
  model?: string;
  limit?: number;
  offset?: number;
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

export interface UsageRecord {
  id: number;
  userId: number | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: string;
  stopReason: string;
  requestId: string;
  createdAt: string;
}

// ── Conversations ────────────────────────────────────────────────────────────

export interface Conversation {
  id: number;
  userId: number | null;
  title: string | null;
  context: Record<string, unknown>;
  lastModel: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  title?: string;
  context: Record<string, unknown>;
  lastModel: string;
}

export interface UpdateConversationRequest {
  title?: string;
  context?: Record<string, unknown>;
  lastModel?: string;
}

// ── Stream Events ────────────────────────────────────────────────────────────

export interface StreamTextEvent {
  text: string;
}

export interface StreamErrorEvent {
  error: string;
}

export type StreamEvent = StreamTextEvent | StreamErrorEvent;
