import type { Request, Response } from "express";
import { Boom } from "@/core/errors";
import { getBreadcrumbs } from "@/core/logger/breadcrumbs";
import { getCurrentTraceContext } from "@/core/logger/trace-context";
import { sanitizeRequestBody } from "@/core/logger/utils";

export function buildErrorContext(
  error: Error,
  req: Request,
  res: Response,
  requestDuration?: number,
) {
  const traceContext = getCurrentTraceContext();
  const breadcrumbs = getBreadcrumbs();
  const sanitizedBody = sanitizeRequestBody(req.body);

  return {
    type: "application_error",
    traceId: traceContext?.traceId,
    parentTraceId: traceContext?.parentTraceId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      isOperational: Boom.isHttpError(error) ? error.isOperational : false,
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      params: req.params,
      query: req.query,
      body: sanitizedBody,
      userAgent: req.headers?.["user-agent"],
      ip: req.ip || req.headers?.["x-forwarded-for"],
    },
    response: {
      statusCode: res.statusCode,
      headersSent: res.headersSent,
    },
    performance:
      requestDuration != null
        ? {
            requestDuration: `${requestDuration}ms`,
          }
        : undefined,
    breadcrumbs: breadcrumbs.map((b) => ({
      timestamp: b.timestamp,
      category: b.category,
      message: b.message,
      level: b.level,
    })),
  };
}
