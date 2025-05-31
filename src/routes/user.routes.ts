import { Router } from 'express';
import { displayUser } from '@/controllers/user.controller';

const router = Router();

router.get('/', displayUser);

export default router;
