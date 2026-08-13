import { Router } from 'express';
import { getBotConfig, updateBotConfig, getEmbedScript, getBotAnalytics, getWorkspaceBots } from '../controllers/bot.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
router.get('/embed/:id', getEmbedScript);

router.get('/', requireAuth, getWorkspaceBots);

router.get('/:id', getBotConfig);

router.put('/:id', updateBotConfig);

router.get('/:id/analytics', getBotAnalytics);

export default router;