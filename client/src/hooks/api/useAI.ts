import { useState, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiClient } from "@/lib/ai-client";
import type {
  ChatRequest,
  ChatResult,
  UsageQuery,
  CreateConversationRequest,
  UpdateConversationRequest,
} from "@/types/ai";

// ── Non-streaming Chat ───────────────────────────────────────────────────────

export function useAIChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ChatRequest) => aiClient.chat(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "usage"] });
    },
  });
}

// ── Streaming Chat ───────────────────────────────────────────────────────────

export function useAIStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<ReturnType<typeof aiClient.stream> | null>(null);
  const queryClient = useQueryClient();

  const stream = useCallback(
    (request: ChatRequest) => {
      // Abort any existing stream before starting a new one
      if (connectionRef.current) {
        connectionRef.current.abort();
      }

      setText("");
      setError(null);
      setIsStreaming(true);

      connectionRef.current = aiClient.stream(request, {
        onText: (chunk) => {
          setText((prev) => prev + chunk);
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
        },
        onComplete: () => {
          setIsStreaming(false);
          queryClient.invalidateQueries({ queryKey: ["ai", "usage"] });
        },
      });
    },
    [queryClient],
  );

  const abort = useCallback(() => {
    connectionRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setText("");
    setError(null);
    setIsStreaming(false);
  }, []);

  return { stream, abort, reset, isStreaming, text, error };
}

// ── Models ───────────────────────────────────────────────────────────────────

export function useAIModels() {
  return useQuery({
    queryKey: ["ai", "models"],
    queryFn: () => aiClient.getModels(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ── Usage ────────────────────────────────────────────────────────────────────

export function useAIUsage(params?: UsageQuery) {
  return useQuery({
    queryKey: ["ai", "usage", params],
    queryFn: () => aiClient.getUsage(params),
  });
}

export function useAIUsageRecords(params?: UsageQuery) {
  return useQuery({
    queryKey: ["ai", "usage", "records", params],
    queryFn: () => aiClient.getUsageRecords(params),
  });
}

// ── Conversations ────────────────────────────────────────────────────────────

export function useAIConversations(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ["ai", "conversations", { limit, offset }],
    queryFn: () => aiClient.getConversations(limit, offset),
  });
}

export function useAIConversation(id: number | null) {
  return useQuery({
    queryKey: ["ai", "conversations", id],
    queryFn: () => aiClient.getConversation(id as number),
    enabled: id !== null,
  });
}

export function useCreateAIConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateConversationRequest) =>
      aiClient.createConversation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });
}

export function useUpdateAIConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...request }: UpdateConversationRequest & { id: number }) =>
      aiClient.updateConversation(id, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations", variables.id] });
    },
  });
}

export function useDeleteAIConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => aiClient.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });
}
