import { Router } from 'express';
import { getBotConfig, updateBotConfig, getEmbedScript, getBotAnalytics, getWorkspaceBots } from '../controllers/bot.controller.js';
import { requireAuth, requireBotOwnership } from '../middlewares/auth.middleware.js';

const router = Router();

// Public: Serves the embeddable JS snippet — intentionally unauthenticated
router.get('/embed/:id', getEmbedScript);

// Authenticated: List all bots for the logged-in tenant
router.get('/', requireAuth, getWorkspaceBots);

// Authenticated + Ownership: Read, update, and analytics for a specific bot
router.get('/:id', requireAuth, requireBotOwnership, getBotConfig);
router.put('/:id', requireAuth, requireBotOwnership, updateBotConfig);
router.get('/:id/analytics', requireAuth, requireBotOwnership, getBotAnalytics);

export default router;