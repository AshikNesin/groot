import * as AIServices from "@/shared/ai/ai.service";
import * as AIUsageServices from "@/shared/ai/ai-usage.service";
import * as AIConversationServices from "@/shared/ai/ai-conversation.service";
import * as AIValidation from "@/shared/ai/ai.validation";
import { aiUsageModel } from "@/shared/ai/ai-usage.model";
import { aiConversationModel } from "@/shared/ai/ai-conversation.model";

export const AISystem = {
  ...AIServices,
  ...AIUsageServices,
  ...AIConversationServices,
  validation: AIValidation,
  models: {
    usage: aiUsageModel,
    conversation: aiConversationModel,
  },
} as const;

export * as AIController from "@/shared/ai/ai.controller";
export * as AIRoutes from "@/shared/ai/ai.routes";
export * as AIService from "@/shared/ai/ai.service";
export * as AIUsageService from "@/shared/ai/ai-usage.service";
export * as AIConversationService from "@/shared/ai/ai-conversation.service";
export * as AIValidation from "@/shared/ai/ai.validation";
