import { Router } from "express";
import { aiController } from "@/controllers/ai.controller";
import { validate } from "@/middlewares/validation.middleware";
import {
  aiRateLimiter,
  aiStreamRateLimiter,
} from "@/middlewares/rate-limit.middleware";
import {
  chatSchema,
  usageQuerySchema,
  createConversationSchema,
  updateConversationSchema,
  listConversationsQuerySchema,
} from "@/validations/ai.validation";

const router = Router();

// ── Chat ─────────────────────────────────────────────────────────────────────

// Non-streaming chat with rate limiter
router.post(
  "/chat",
  aiRateLimiter,
  validate(chatSchema),
  aiController.chat,
);

// Streaming chat with stricter rate limiter (flag in body)
router.post(
  "/chat/stream",
  aiStreamRateLimiter,
  validate(chatSchema),
  aiController.chat,
);

// ── Models ───────────────────────────────────────────────────────────────────

router.get("/models", aiController.getModels);

// ── Usage ────────────────────────────────────────────────────────────────────

router.get("/usage", validate(usageQuerySchema, "query"), aiController.getUsage);

router.get(
  "/usage/records",
  validate(usageQuerySchema, "query"),
  aiController.getUsageRecords,
);

// ── Conversations ─────────────────────────────────────────────────────────────

router.get(
  "/conversations",
  validate(listConversationsQuerySchema, "query"),
  aiController.listConversations,
);

router.post(
  "/conversations",
  validate(createConversationSchema),
  aiController.createConversation,
);

router.get("/conversations/:id", aiController.getConversation);

router.patch(
  "/conversations/:id",
  validate(updateConversationSchema),
  aiController.updateConversation,
);

router.delete("/conversations/:id", aiController.deleteConversation);

export default router;
