import { Router } from 'express';
import { displayUser } from '@/controllers/user.controller';

const router = Router();

router.get('/user', displayUser);

export default router;
