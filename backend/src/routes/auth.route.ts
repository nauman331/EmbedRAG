import { Router } from 'express';
import { register, login, refreshTokens, logout, getActiveSessions, revokeSession, registerSchema, loginSchema } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rate.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

router.post('/refresh', refreshTokens);
router.post('/logout', logout);

router.get('/sessions', requireAuth, getActiveSessions);
router.delete('/sessions/:sessionId', requireAuth, revokeSession);

export default router;