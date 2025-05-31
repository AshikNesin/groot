import express from 'express';
import userRoutes from '@/routes/user.routes.ts';
import todoRoutes from '@/routes/todo.routes.ts'; // Added import for todo routes
import basicAuthMiddleware from '@/middlewares/basicAuth.middleware';
import corsMiddleware from '@/middlewares/cors.middleware';
import { env } from '@/env';

const app = express();
const port = env.PORT;

// CORS Middleware
app.use(corsMiddleware);

// Add express.json() middleware to parse JSON request bodies
app.use(express.json());

// Health check endpoint (unprotected)
app.get('/health', (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Basic Authentication
app.use(basicAuthMiddleware);

app.use('/', userRoutes); // Use the new user router
app.use('/api', todoRoutes); // Use the new todo router with /api prefix

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
