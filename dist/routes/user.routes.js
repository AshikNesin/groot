import { Router } from 'express';
import { displayUser } from '@/controllers/user.controller.js'; // Ensure .js extension
const router = Router();
router.get('/', displayUser);
export default router;
