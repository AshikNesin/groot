import * as PasskeyServices from "@/shared/passkey/passkey.service";
import * as PasskeyValidation from "@/shared/passkey/passkey.validation";
import { passkeyModel } from "@/shared/passkey/passkey.model";

export const PasskeySystem = {
  ...PasskeyServices,
  validation: PasskeyValidation,
  model: passkeyModel,
} as const;

export * as PasskeyController from "@/shared/passkey/passkey.controller";
export * as PasskeyRoutes from "@/shared/passkey/passkey.routes";
export * as PasskeyService from "@/shared/passkey/passkey.service";
export * as PasskeyValidation from "@/shared/passkey/passkey.validation";
export * as PasskeyModel from "@/shared/passkey/passkey.model";
