import * as TodoServices from "@/app/todo/todo.service";
import * as TodoValidation from "@/app/todo/todo.validation";
import { todoModel } from "@/app/todo/todo.model";
import * as TodoJobs from "@/app/todo/todo.jobs";

export const TodoSystem = {
  ...TodoServices,
  validation: TodoValidation,
  models: {
    todo: todoModel,
  },
  jobs: TodoJobs,
} as const;

export * as TodoController from "@/app/todo/todo.controller";
export * as TodoRoutes from "@/app/todo/todo.routes";
export * as TodoService from "@/app/todo/todo.service";
export * as TodoValidation from "@/app/todo/todo.validation";
export * as TodoJobs from "@/app/todo/todo.jobs";
