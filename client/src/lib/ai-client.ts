import { apiClient } from "@/lib/api";
import type {
  ChatRequest,
  ChatResult,
  ModelInfo,
  UsageQuery,
  UsageStats,
  UsageRecord,
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest,
  StreamEvent,
} from "@/types/ai";

// ── Stream Connection Interface ──────────────────────────────────────────────

interface StreamHandlers {
  onText?: (text: string) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

interface StreamConnection {
  abort: () => void;
}

// ── AI Client ────────────────────────────────────────────────────────────────

class AIClient {
  // ── Chat ────────────────────────────────────────────────────────────────────

  async chat(request: ChatRequest): Promise<ChatResult> {
    return apiClient.post<ChatResult>("/ai/chat", request);
  }

  stream(request: ChatRequest, handlers: StreamHandlers): StreamConnection {
    const controller = new AbortController();

    fetch("/api/v1/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, stream: true }),
      signal: controller.signal,
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                handlers.onComplete?.();
                return;
              }
              try {
                const event = JSON.parse(data) as StreamEvent;
                if ("text" in event) {
                  handlers.onText?.(event.text);
                } else if ("error" in event) {
                  handlers.onError?.(event.error);
                }
              } catch {
                // Skip malformed events
              }
            }
          }
        }
        handlers.onComplete?.();
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          handlers.onError?.(error.message || "Stream error");
        }
      });

    return {
      abort: () => controller.abort(),
    };
  }

  // ── Models ──────────────────────────────────────────────────────────────────

  async getModels(): Promise<ModelInfo[]> {
    return apiClient.get<ModelInfo[]>("/ai/models");
  }

  // ── Usage ───────────────────────────────────────────────────────────────────

  async getUsage(params?: UsageQuery): Promise<UsageStats> {
    return apiClient.get<UsageStats>("/ai/usage", params as Record<string, unknown>);
  }

  async getUsageRecords(params?: UsageQuery): Promise<UsageRecord[]> {
    return apiClient.get<UsageRecord[]>("/ai/usage/records", params as Record<string, unknown>);
  }

  // ── Conversations ───────────────────────────────────────────────────────────

  async getConversations(limit = 20, offset = 0): Promise<Conversation[]> {
    return apiClient.get<Conversation[]>("/ai/conversations", { limit, offset });
  }

  async getConversation(id: number): Promise<Conversation> {
    return apiClient.get<Conversation>(`/ai/conversations/${id}`);
  }

  async createConversation(request: CreateConversationRequest): Promise<Conversation> {
    return apiClient.post<Conversation>("/ai/conversations", request);
  }

  async updateConversation(id: number, request: UpdateConversationRequest): Promise<Conversation> {
    return apiClient.patch<Conversation>(`/ai/conversations/${id}`, request);
  }

  async deleteConversation(id: number): Promise<void> {
    await apiClient.delete(`/ai/conversations/${id}`);
  }
}

export const aiClient = new AIClient();
