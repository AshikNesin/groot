import express from 'express';
import userRoutes from '@/routes/user.routes.js'; // Ensure .js extension
const app = express();
const port = process.env.PORT || 3000;
app.use('/', userRoutes); // Use the new user router
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
