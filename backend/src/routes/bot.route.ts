import { Router } from 'express';
import { getBotConfig, getEmbedScript, updateBotConfig, getBotAnalytics } from '../controllers/bot.controller';

const router = Router();

router.get('/:id', getBotConfig);
router.put('/:id', updateBotConfig);
router.get('/embed/:id', getEmbedScript);
router.get('/:id/analytics', getBotAnalytics);

export default router;