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

// Error handling middleware
app.use(errorLoggerMiddleware);

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
