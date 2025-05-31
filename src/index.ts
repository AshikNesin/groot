// Import Sentry first, before any other imports
import { Sentry } from "@/core/instrument";

import express from "express";
import userRoutes from "@/routes/user.routes.ts";
import todoRoutes from "@/routes/todo.routes.ts";
import basicAuthMiddleware from "@/middlewares/basicAuth.middleware";
import corsMiddleware from "@/middlewares/cors.middleware";
import { requestLoggerMiddleware, errorLoggerMiddleware } from "@/middlewares/requestLogger.middleware";
import { env } from "@/env";
import { logger } from "@/core/logger";

const app = express();
const port = env.PORT;

// Request logging middleware
app.use(requestLoggerMiddleware);

// CORS Middleware
app.use(corsMiddleware);

// Add express.json() middleware to parse JSON request bodies
app.use(express.json());

// Health check endpoint (unprotected)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "It Works!",
  });
});

// Basic Authentication
app.use(basicAuthMiddleware);

app.use(userRoutes);
app.use(todoRoutes);

// Debug route for Sentry testing
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

// Set up Sentry error handler (must be before any other error middleware)
Sentry.setupExpressErrorHandler(app);

// Error handling middleware
app.use(errorLoggerMiddleware);

// Optional fallthrough error handler for Sentry
app.use(function onError(err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end((res as any).sentry + "\n");
});

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
