import { Router } from 'express';
import { getLeads } from '../controllers/lead.controller.js';
import { requireAuth, requireBotOwnership } from '../middlewares/auth.middleware.js';

const router = Router();

// Leads contain PII — always require auth and ownership verification
router.get('/:botId', requireAuth, requireBotOwnership, getLeads);

export default router;