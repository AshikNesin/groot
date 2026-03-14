import type { Request, Response } from "express";
import { BaseController } from "@/core/base-controller";
import { ResponseHandler } from "@/core/response-handler";
import { aiService } from "@/services/ai.service";
import type {
  ChatDTO,
  UsageQueryDTO,
  CreateConversationDTO,
  UpdateConversationDTO,
  ListConversationsQueryDTO,
} from "@/validations/ai.validation";

class AIController extends BaseController {
  // ── Chat ────────────────────────────────────────────────────────────────────

  chat = async (req: Request, res: Response) => {
    const payload = (req.validated?.body || req.body) as ChatDTO;
    const userId = req.user?.userId;
    const result = await aiService.chat(payload, userId);
    ResponseHandler.success(res, result);
  };

  chatStream = async (req: Request, res: Response) => {
    const payload = (req.validated?.body || req.body) as ChatDTO;
    const userId = req.user?.userId;

    // SSE streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      for await (const chunk of aiService.chatStream(payload, userId)) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI streaming error";
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  };

  // ── Models ──────────────────────────────────────────────────────────────────

  getModels = async (_req: Request, res: Response) => {
    const models = await aiService.getModels();
    ResponseHandler.success(res, models);
  };

  // ── Usage ───────────────────────────────────────────────────────────────────

  getUsage = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const query = (req.validated?.query || req.query) as UsageQueryDTO;
    const stats = await aiService.getUsage(userId, query);
    ResponseHandler.success(res, stats);
  };

  getUsageRecords = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const query = (req.validated?.query || req.query) as UsageQueryDTO;
    const records = await aiService.getUsageRecords(userId, query);
    ResponseHandler.success(res, records);
  };

  // ── Conversations ───────────────────────────────────────────────────────────

  listConversations = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const query = (req.validated?.query || req.query) as ListConversationsQueryDTO;
    const conversations = await aiService.listConversations(
      userId,
      query.limit,
      query.offset,
    );
    ResponseHandler.success(res, conversations);
  };

  getConversation = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const id = this.parseId(req.params.id);
    const conversation = await aiService.getConversation(id, userId);

    if (!conversation) {
      return ResponseHandler.notFound(res, "Conversation not found");
    }

    ResponseHandler.success(res, conversation);
  };

  createConversation = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const payload = (req.validated?.body || req.body) as CreateConversationDTO;
    const conversation = await aiService.createConversation(payload, userId);
    ResponseHandler.created(res, conversation);
  };

  updateConversation = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const id = this.parseId(req.params.id);
    const payload = (req.validated?.body || req.body) as UpdateConversationDTO;
    const conversation = await aiService.updateConversation(id, payload, userId);

    if (!conversation) {
      return ResponseHandler.notFound(res, "Conversation not found");
    }

    ResponseHandler.success(res, conversation);
  };

  deleteConversation = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const id = this.parseId(req.params.id);
    const deleted = await aiService.deleteConversation(id, userId);

    if (!deleted) {
      return ResponseHandler.notFound(res, "Conversation not found");
    }

    ResponseHandler.noContent(res);
  };
}

export const aiController = new AIController();
