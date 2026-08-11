import { Router } from 'express';
import { register, login, refreshTokens, logout, getActiveSessions, revokeSession } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rate.middleware';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

router.post('/refresh', refreshTokens);
router.post('/logout', logout);

router.get('/sessions', requireAuth, getActiveSessions);
router.delete('/sessions/:sessionId', requireAuth, revokeSession);

export default router;