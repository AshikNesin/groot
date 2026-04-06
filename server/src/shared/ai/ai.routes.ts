import { Router } from "express";
import * as aiController from "./ai.controller";
import { validate } from "@/core/middlewares/validation.middleware";
import { jwtAuthMiddleware } from "@/core/middlewares/jwt-auth.middleware";
import { aiRateLimiter, aiStreamRateLimiter } from "@/core/middlewares/rate-limit.middleware";
import {
  chatSchema,
  usageQuerySchema,
  createConversationSchema,
  updateConversationSchema,
  listConversationsQuerySchema,
} from "@/shared/ai/ai.validation";

import { handle } from "@/core/middlewares/route-handler.middleware";

const router = Router();

// Chat endpoints
router.post(
  "/chat",
  jwtAuthMiddleware,
  validate(chatSchema),
  aiRateLimiter,
  handle(aiController.chat),
);

router.post(
  "/chat/stream",
  jwtAuthMiddleware,
  validate(chatSchema),
  aiStreamRateLimiter,
  handle(aiController.chatStream),
);

// Models endpoint
router.get("/models", handle(aiController.getModels));

// Usage endpoints
router.get("/usage", jwtAuthMiddleware, validate(usageQuerySchema, "query"), handle(aiController.getUsage));

router.get(
  "/usage/records",
  jwtAuthMiddleware,
  validate(usageQuerySchema, "query"),
  handle(aiController.getUsageRecords),
);

// Conversation endpoints
router.post(
  "/conversations",
  jwtAuthMiddleware,
  validate(createConversationSchema),
  handle(aiController.createConversation),
);

router.get("/conversations", jwtAuthMiddleware, validate(listConversationsQuerySchema, "query"), handle(aiController.listConversations));

router.get("/conversations/:id", jwtAuthMiddleware, handle(aiController.getConversation));

router.patch(
  "/conversations/:id",
  jwtAuthMiddleware,
  validate(updateConversationSchema),
  handle(aiController.updateConversation),
);

router.delete("/conversations/:id", jwtAuthMiddleware, handle(aiController.deleteConversation));

export default router;
