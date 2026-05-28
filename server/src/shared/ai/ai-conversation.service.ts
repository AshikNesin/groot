import { Boom } from "@/core/errors";
import { aiConversationModel } from "@/shared/ai/ai-conversation.model";
import type { CreateConversationDTO, UpdateConversationDTO } from "@/shared/ai/ai.validation";

export async function createConversation({
  data,
  userId,
}: {
  data: CreateConversationDTO;
  userId?: number;
}) {
  return aiConversationModel.create({
    userId,
    title: data.title,
    context: data.context as Record<string, unknown>,
    lastModel: data.lastModel,
  });
}

export async function getConversation({ id, userId }: { id: number; userId?: number }) {
  return aiConversationModel.findById(id, userId);
}

export async function listConversations({
  userId,
  limit = 20,
  offset = 0,
}: {
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  if (userId === undefined) {
    throw new Error("Authentication required for listing conversations");
  }
  return aiConversationModel.findByUser(userId, limit, offset);
}

export async function updateConversation({
  id,
  data,
  userId,
}: {
  id: number;
  data: UpdateConversationDTO;
  userId?: number;
}) {
  if (!userId) {
    throw Boom.badRequest("User ID is required to update a conversation");
  }

  const existing = await aiConversationModel.findById(id, userId);
  if (!existing) {
    return null;
  }

  const updateData: Parameters<typeof aiConversationModel.update>[1] = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.context !== undefined) updateData.context = data.context as Record<string, unknown>;
  if (data.lastModel !== undefined) updateData.lastModel = data.lastModel;

  return aiConversationModel.update(id, updateData);
}

export async function deleteConversation({ id, userId }: { id: number; userId?: number }) {
  if (!userId) {
    throw Boom.badRequest("User ID is required to delete a conversation");
  }

  const existing = await aiConversationModel.findById(id, userId);
  if (!existing) {
    return null;
  }

  return aiConversationModel.delete(id);
}
