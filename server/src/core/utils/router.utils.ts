import { Router, type RouterOptions } from "express";
import { handle } from "@/core/middlewares/route-handler.middleware";

/**
 * Enhanced Router type that allows methods to accept handlers returning values.
 * We intersect with a version that has relaxed method signatures.
 */
export type EnhancedRouter = Router & {
  get: (...args: any[]) => EnhancedRouter;
  post: (...args: any[]) => EnhancedRouter;
  put: (...args: any[]) => EnhancedRouter;
  delete: (...args: any[]) => EnhancedRouter;
  patch: (...args: any[]) => EnhancedRouter;
  use: (...args: any[]) => EnhancedRouter;
};

/**
 * Creates a standard Express Router with enhanced methods that automatically
 * wrap the final handler in the Return-Value Middleware (`handle`).
 */
export function createRouter(options?: RouterOptions): EnhancedRouter {
  const router = Router(options) as any;

  const methods = ["get", "post", "put", "delete", "patch", "use"] as const;

  for (const method of methods) {
    const originalMethod = router[method].bind(router);

    router[method] = (...args: any[]) => {
      const lastIdx = args.length - 1;
      // Automatically wrap the last argument if it's a function (the handler)
      if (typeof args[lastIdx] === "function") {
        args[lastIdx] = handle(args[lastIdx]);
      }
      return originalMethod(...args);
    };
  }

  return router as EnhancedRouter;
}
