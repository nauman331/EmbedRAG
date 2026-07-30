import { Router } from 'express';
import { getBotConfig, getEmbedScript, updateBotConfig } from '../controllers/bot.controller';

const router = Router();

router.get('/:id', getBotConfig);
router.put('/:id', updateBotConfig);
router.get('/embed/:id', getEmbedScript);

export default router;