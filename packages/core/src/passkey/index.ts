import * as PasskeyServices from "./passkey.service";
import * as PasskeyValidation from "./passkey.validation";
import { passkeyModel } from "./passkey.model";

export const PasskeySystem = {
  ...PasskeyServices,
  validation: PasskeyValidation,
  model: passkeyModel,
} as const;

export * as PasskeyController from "./passkey.controller";
export * as PasskeyRoutes from "./passkey.routes";
export * as PasskeyService from "./passkey.service";
export * as PasskeyValidation from "./passkey.validation";
export * as PasskeyModel from "./passkey.model";
