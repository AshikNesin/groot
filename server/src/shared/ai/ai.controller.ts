import type { Request, Response } from "express";
import * as AIService from "@/shared/ai/ai.service";
import * as AIUsageService from "@/shared/ai/ai-usage.service";
import * as AIConversationService from "@/shared/ai/ai-conversation.service";
import type {
  ChatDTO,
  UsageQueryDTO,
  CreateConversationDTO,
  UpdateConversationDTO,
  ListConversationsQueryDTO,
} from "@/shared/ai/ai.validation";
import { parseId } from "@/core/utils/controller.utils";
import { Boom } from "@/core/errors";

export async function chat(req: Request) {
  const payload = req.body as ChatDTO;
  const userId = req.user?.userId;
  return await AIService.chat({ input: payload, userId });
}

export async function chatStream(req: Request, res: Response) {
  const payload = req.body as ChatDTO;
  const userId = req.user?.userId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const chunk of AIService.chatStream({ input: payload, userId })) {
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

export async function getModels() {
  return await AIService.getModels();
}

export async function getUsage(req: Request) {
  const userId = req.user?.userId;
  const query = req.query as unknown as UsageQueryDTO;
  return await AIUsageService.getUsage({ userId, params: query });
}

export async function getUsageRecords(req: Request) {
  const userId = req.user?.userId;
  const query = req.query as unknown as UsageQueryDTO;
  return await AIUsageService.getUsageRecords({ userId, params: query });
}

export async function listConversations(req: Request) {
  const userId = req.user?.userId;
  const query = req.query as unknown as ListConversationsQueryDTO;
  return await AIConversationService.listConversations({
    userId,
    limit: query.limit,
    offset: query.offset,
  });
}

export async function getConversation(req: Request) {
  const userId = req.user?.userId;
  const id = parseId(req.params.id);
  const conversation = await AIConversationService.getConversation({ id, userId });

  if (!conversation) {
    throw Boom.notFound("Conversation not found");
  }

  return conversation;
}

export async function createConversation(req: Request, res: Response) {
  const userId = req.user?.userId;
  const payload = req.body as CreateConversationDTO;
  res.status(201);
  return await AIConversationService.createConversation({ data: payload, userId });
}

export async function updateConversation(req: Request) {
  const userId = req.user?.userId;
  const id = parseId(req.params.id);
  const payload = req.body as UpdateConversationDTO;
  const conversation = await AIConversationService.updateConversation({
    id,
    data: payload,
    userId,
  });

  if (!conversation) {
    throw Boom.notFound("Conversation not found");
  }

  return conversation;
}

export async function deleteConversation(req: Request) {
  const userId = req.user?.userId;
  const id = parseId(req.params.id);
  const deleted = await AIConversationService.deleteConversation({ id, userId });

  if (!deleted) {
    throw Boom.notFound("Conversation not found");
  }
  // returns undefined, which means 204 No Content under route-handler.
}
