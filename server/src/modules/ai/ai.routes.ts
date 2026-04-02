import { Router } from "express";
import { aiController } from "@/modules/ai/ai.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { jwtAuthMiddleware } from "@/core/middlewares/jwt-auth.middleware";
import { aiRateLimiter, aiStreamRateLimiter } from "@/core/middlewares/rate-limit.middleware";
import {
  chatSchema,
  usageQuerySchema,
  createConversationSchema,
  updateConversationSchema,
  listConversationsQuerySchema,
} from "@/modules/ai/ai.validation";

const router = Router();

// ── Chat ─────────────────────────────────────────────────────────────────────

// Non-streaming chat with rate limiter
router.post("/chat", aiRateLimiter, validate(chatSchema), aiController.chat);

// Streaming chat with stricter rate limiter (dedicated endpoint)
router.post("/chat/stream", aiStreamRateLimiter, validate(chatSchema), aiController.chatStream);

// ── Models ───────────────────────────────────────────────────────────────────

router.get("/models", aiController.getModels);

// ── Usage (requires auth to scope to user) ────────────────────────────────────

router.get("/usage", jwtAuthMiddleware, validate(usageQuerySchema, "query"), aiController.getUsage);

router.get(
  "/usage/records",
  jwtAuthMiddleware,
  validate(usageQuerySchema, "query"),
  aiController.getUsageRecords,
);

// ── Conversations (requires auth) ─────────────────────────────────────────────

router.get(
  "/conversations",
  jwtAuthMiddleware,
  validate(listConversationsQuerySchema, "query"),
  aiController.listConversations,
);

router.post(
  "/conversations",
  jwtAuthMiddleware,
  validate(createConversationSchema),
  aiController.createConversation,
);

router.get("/conversations/:id", jwtAuthMiddleware, aiController.getConversation);

router.patch(
  "/conversations/:id",
  jwtAuthMiddleware,
  validate(updateConversationSchema),
  aiController.updateConversation,
);

router.delete("/conversations/:id", jwtAuthMiddleware, aiController.deleteConversation);

export default router;
