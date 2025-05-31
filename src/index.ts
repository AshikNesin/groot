import express from 'express';
import dotenv from 'dotenv';
import basicAuth from 'express-basic-auth';
import cors from 'cors';
import userRoutes from '@/routes/user.routes.js'; // Ensure .js extension

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS Middleware
app.use(cors());

// Basic Authentication
app.use(basicAuth({
  users: {
    [process.env.BASIC_AUTH_USERNAME || 'admin']: process.env.BASIC_AUTH_PASSWORD || 'password',
  },
  challenge: true,
  realm: 'Restricted Area. Please login.',
  unauthorizedResponse: 'Unauthorized',
}));

app.use('/', userRoutes); // Use the new user router

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
