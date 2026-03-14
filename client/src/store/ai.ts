import { create } from "zustand";
import type { ChatRequest, ModelInfo } from "@/types/ai";

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// Default models for each provider
const PROVIDER_DEFAULTS: Record<string, { model: string }> = {
  openai: { model: "gpt-4o-mini" },
  anthropic: { model: "claude-3-7-sonnet" },
  google: { model: "gemini-2.0-flash" },
  mistral: { model: "mistral-large-latest" },
  groq: { model: "llama-3.3-70b-versatile" },
  xai: { model: "grok-2-1212" },
  openrouter: { model: "anthropic/claude-sonnet-4" },
};

interface AIState {
  // Conversation state
  messages: Message[];
  currentModel: string;
  currentProvider: string;
  systemPrompt: string | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setModel: (model: string) => void;
  setProvider: (provider: string) => void;
  setSystemPrompt: (prompt: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Helpers
  getRequest: () => ChatRequest | null;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAIStore = create<AIState>((set, get) => ({
  // Initial state
  messages: [],
  currentModel: "claude-3-7-sonnet",
  currentProvider: "anthropic",
  systemPrompt: null,
  isLoading: false,
  error: null,

  // Actions
  addUserMessage: (content) => {
    const message: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
  },

  addAssistantMessage: (content) => {
    const message: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content,
      timestamp: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
  },

  setMessages: (messages) => set({ messages }),

  clearMessages: () =>
    set({
      messages: [],
      error: null,
    }),

  setModel: (model) => set({ currentModel: model }),

  setProvider: (provider) => {
    // Reset model to a compatible default for the new provider
    const defaultModel = PROVIDER_DEFAULTS[provider]?.model ?? "";
    set({ currentProvider: provider, currentModel: defaultModel });
  },

  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  // Helpers
  getRequest: () => {
    const state = get();
    // Get last user message for simple API
    const lastUserMessage = [...state.messages].reverse().find((m) => m.role === "user");

    // Don't build a request with empty message - API rejects it
    if (!lastUserMessage?.content) {
      return null;
    }

    return {
      message: lastUserMessage.content,
      provider: state.currentProvider,
      model: state.currentModel,
      systemPrompt: state.systemPrompt ?? undefined,
    };
  },
}));

// ── Selectors ────────────────────────────────────────────────────────────────

export const useAIMessages = () => useAIStore((state) => state.messages);
export const useAIIsLoading = () => useAIStore((state) => state.isLoading);
export const useAIError = () => useAIStore((state) => state.error);
export const useAICurrentModel = () => useAIStore((state) => state.currentModel);
export const useAICurrentProvider = () => useAIStore((state) => state.currentProvider);
