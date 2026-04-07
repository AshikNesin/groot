import * as AuthServices from "@/shared/auth/auth.service";
import * as AuthValidation from "@/shared/auth/auth.validation";
import { userModel } from "@/shared/auth/user.model";

export const AuthSystem = {
  ...AuthServices,
  validation: AuthValidation,
  model: userModel,
} as const;

export * as AuthController from "@/shared/auth/auth.controller";
export * as AuthRoutes from "@/shared/auth/auth.routes";
export * as AuthService from "@/shared/auth/auth.service";
export * as AuthValidation from "@/shared/auth/auth.validation";
export * as UserModel from "@/shared/auth/user.model";
