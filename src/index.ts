import express from 'express';
import dotenv from 'dotenv';
import userRoutes from '@/routes/user.routes.js'; // Ensure .js extension
import basicAuthMiddleware from './middlewares/basicAuth.middleware.js';
import corsMiddleware from './middlewares/cors.middleware.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
