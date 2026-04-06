import * as AIServices from "./ai.service";
import * as AIValidation from "./ai.validation";
import { aiUsageModel, aiConversationModel } from "./ai-usage.model";

export const AISystem = {
  ...AIServices,
  validation: AIValidation,
  models: {
    usage: aiUsageModel,
    conversation: aiConversationModel,
  },
} as const;

export * as AIController from "./ai.controller";
export * as AIRoutes from "./ai.routes";
export * as AIService from "./ai.service";
export * as AIValidation from "./ai.validation";
