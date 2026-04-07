import { createRouter } from "@/core/utils/router.utils";
import * as aiController from "@/shared/ai/ai.controller";
import { validateBody, validateQuery } from "@/core/middlewares/validation.middleware";
import {
  chatSchema,
  usageQuerySchema,
  createConversationSchema,
  updateConversationSchema,
  listConversationsQuerySchema,
} from "@/shared/ai/ai.validation";
import { jwtAuthMiddleware } from "@/core/middlewares/jwt-auth.middleware";
import { aiRateLimiter, aiStreamRateLimiter } from "@/core/middlewares/rate-limit.middleware";

const router = createRouter();

// ── Chat ─────────────────────────────────────────────────────────────────────

router.post("/chat", aiRateLimiter, validateBody(chatSchema), aiController.chat);
router.post("/chat/stream", aiStreamRateLimiter, validateBody(chatSchema), aiController.chatStream);

// ── Models ───────────────────────────────────────────────────────────────────

router.get("/models", aiController.getModels);

// ── Usage (Require Auth) ─────────────────────────────────────────────────────

router.use(jwtAuthMiddleware);

router.get("/usage", validateQuery(usageQuerySchema), aiController.getUsage);
router.get("/usage/records", validateQuery(usageQuerySchema), aiController.getUsageRecords);

// ── Conversations (Require Auth) ─────────────────────────────────────────────

router.get(
  "/conversations",
  validateQuery(listConversationsQuerySchema),
  aiController.listConversations,
);
router.post(
  "/conversations",
  validateBody(createConversationSchema),
  aiController.createConversation,
);
router.get("/conversations/:id", aiController.getConversation);
router.patch(
  "/conversations/:id",
  validateBody(updateConversationSchema),
  aiController.updateConversation,
);
router.delete("/conversations/:id", aiController.deleteConversation);

export default router;
