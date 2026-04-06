import * as TodoServices from "./todo.service";
import * as TodoValidation from "./todo.validation";
import { todoModel } from "./todo.model";
import * as TodoJobs from "./todo.jobs";

export const TodoSystem = {
  ...TodoServices,
  validation: TodoValidation,
  models: {
    todo: todoModel,
  },
  jobs: TodoJobs,
} as const;

export * as TodoController from "./todo.controller";
export * as TodoRoutes from "./todo.routes";
export * as TodoService from "./todo.service";
export * as TodoValidation from "./todo.validation";
export * as TodoJobs from "./todo.jobs";
