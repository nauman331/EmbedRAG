import { Router } from 'express';
import { getBotConfig, updateBotConfig } from '../controllers/bot.controller';

const router = Router();

router.get('/:id', getBotConfig);
router.put('/:id', updateBotConfig);

export default router;