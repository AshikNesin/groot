import * as AuthServices from "./auth.service";
import * as AuthValidation from "./auth.validation";
import { userModel } from "./user.model";

export const AuthSystem = {
  ...AuthServices,
  validation: AuthValidation,
  model: userModel,
} as const;

export * as AuthController from "./auth.controller";
export * as AuthRoutes from "./auth.routes";
export * as AuthService from "./auth.service";
export * as AuthValidation from "./auth.validation";
export * as UserModel from "./user.model";
