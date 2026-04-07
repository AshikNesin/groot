import { createRouter } from "@/core/utils/router.utils";
import * as aiController from "@/shared/ai/ai.controller";
import { validateBody } from "@/core/middlewares/validation.middleware";
import { askSchema, summarizeSchema, translateSchema } from "@/shared/ai/ai.validation";

const router = createRouter();

router.post("/ask", validateBody(askSchema), aiController.ask);
router.post("/summarize", validateBody(summarizeSchema), aiController.summarize);
router.post("/translate", validateBody(translateSchema), aiController.translate);

export default router;
