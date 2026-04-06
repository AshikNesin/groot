import * as AIServices from "@/shared/ai/ai.service";
import * as AIValidation from "@/shared/ai/ai.validation";
import { aiUsageModel, aiConversationModel } from "@/shared/ai/ai-usage.model";

export const AISystem = {
  ...AIServices,
  validation: AIValidation,
  models: {
    usage: aiUsageModel,
    conversation: aiConversationModel,
  },
} as const;

export * as AIController from "@/shared/ai/ai.controller";
export * as AIRoutes from "@/shared/ai/ai.routes";
export * as AIService from "@/shared/ai/ai.service";
export * as AIValidation from "@/shared/ai/ai.validation";
