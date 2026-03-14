import { z } from "zod";

// ── Chat Schema ─────────────────────────────────────────────────────────────

export const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  stream: z.boolean().optional().default(false),
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).optional(),
});

export type ChatDTO = z.infer<typeof chatSchema>;

// ── Usage Query Schema ───────────────────────────────────────────────────────

export const usageQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type UsageQueryDTO = z.infer<typeof usageQuerySchema>;

// ── Conversation Schemas ─────────────────────────────────────────────────────

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
  context: z.record(z.unknown()), // Serialized pi-ai Context
  lastModel: z.string().min(1),
});

export const updateConversationSchema = z.object({
  title: z.string().max(200).optional(),
  context: z.record(z.unknown()).optional(),
  lastModel: z.string().min(1).optional(),
});

export const listConversationsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type CreateConversationDTO = z.infer<typeof createConversationSchema>;
export type UpdateConversationDTO = z.infer<typeof updateConversationSchema>;
export type ListConversationsQueryDTO = z.infer<typeof listConversationsQuerySchema>;
