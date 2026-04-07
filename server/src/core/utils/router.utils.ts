import { Router, type RouterOptions } from "express";
import { handle } from "@/core/middlewares/route-handler.middleware";

/**
 * Enhanced Router type that allows methods to accept handlers returning values.
 * We intersect with a version that has relaxed method signatures.
 *
 * Note: `any[]` is required here because Express router methods accept variable
 * arguments (path, middleware[], handler). The type system cannot express this
 * flexibly while maintaining the enhanced return type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // Cast to any to allow method reassignment - Express Router interface doesn't
  // support mutation of method signatures
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const router = Router(options) as any;

  const methods = ["get", "post", "put", "delete", "patch", "use"] as const;

  for (const method of methods) {
    const originalMethod = router[method].bind(router);

    // Args can be (path, ...middleware[], handler) - variable length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router[method] = (...args: any[]) => {
      const lastIdx = args.length - 1;
      const lastArg = args[lastIdx];
      // Only wrap if the last argument is a function that expects 2 or fewer
      // parameters (i.e. (req, res) controllers). Functions with 3+ declared
      // params — such as middleware using (req, res, next) or Express error
      // handlers using (err, req, res, next) — must be passed through as-is
      // so Express provides the next/error parameters correctly.
      if (typeof lastArg === "function" && lastArg.length <= 2) {
        args[lastIdx] = handle(lastArg);
      }
      return originalMethod(...args);
    };
  }

  return router as EnhancedRouter;
}
