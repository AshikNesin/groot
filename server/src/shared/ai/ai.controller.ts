import type { Request, Response } from "express";
import { ResponseHandler } from "@/core/response-handler";
import * as AISystem from "./ai.service";
import type {
  ChatDTO,
  UsageQueryDTO,
  CreateConversationDTO,
  UpdateConversationDTO,
  ListConversationsQueryDTO,
} from "./ai.validation";
import { parseId } from "@/core/utils/controller.utils";

export async function chat(req: Request, res: Response): Promise<void> {
  const payload = (req.validated?.body || req.body) as ChatDTO;
  const userId = req.user?.userId;
  const result = await AISystem.chat({ input: payload, userId });
  ResponseHandler.success(res, result);
}

export async function chatStream(req: Request, res: Response): Promise<void> {
  const payload = (req.validated?.body || req.body) as ChatDTO;
  const userId = req.user?.userId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const chunk of AISystem.chatStream({ input: payload, userId })) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI streaming error";
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
}

export async function getModels(_req: Request, res: Response): Promise<void> {
  const models = await AISystem.getModels();
  ResponseHandler.success(res, models);
}

export async function getUsage(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const query = (req.validated?.query || req.query) as UsageQueryDTO;
  const stats = await AISystem.getUsage({ userId, params: query });
  ResponseHandler.success(res, stats);
}

export async function getUsageRecords(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const query = (req.validated?.query || req.query) as UsageQueryDTO;
  const records = await AISystem.getUsageRecords({ userId, params: query });
  ResponseHandler.success(res, records);
}

export async function listConversations(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const query = (req.validated?.query || req.query) as ListConversationsQueryDTO;
  const conversations = await AISystem.listConversations({
    userId,
    limit: query.limit,
    offset: query.offset,
  });
  ResponseHandler.success(res, conversations);
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const id = parseId(req.params.id);
  const conversation = await AISystem.getConversation({ id, userId });

  if (!conversation) {
    ResponseHandler.notFound(res, "Conversation not found");
    return;
  }

  ResponseHandler.success(res, conversation);
}

export async function createConversation(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const payload = (req.validated?.body || req.body) as CreateConversationDTO;
  const conversation = await AISystem.createConversation({ data: payload, userId });
  ResponseHandler.created(res, conversation);
}

export async function updateConversation(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const id = parseId(req.params.id);
  const payload = (req.validated?.body || req.body) as UpdateConversationDTO;
  const conversation = await AISystem.updateConversation({ id, data: payload, userId });

  if (!conversation) {
    ResponseHandler.notFound(res, "Conversation not found");
    return;
  }

  ResponseHandler.success(res, conversation);
}

export async function deleteConversation(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const id = parseId(req.params.id);
  const deleted = await AISystem.deleteConversation({ id, userId });

  if (!deleted) {
    ResponseHandler.notFound(res, "Conversation not found");
    return;
  }

  ResponseHandler.noContent(res);
}
