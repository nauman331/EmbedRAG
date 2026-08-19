import { Router } from 'express';
import { getConversations, takeOverConversation, adminReply } from '../controllers/conversation.controller.js';
import { requireAuth, requireBotOwnership } from '../middlewares/auth.middleware.js';

const router = Router();

// All admin conversation operations are gated behind auth
router.get('/:botId', requireAuth, requireBotOwnership, getConversations);
// takeover and reply: ownership is verified inside the controller (sessionId → convo → bot → tenantId)
router.post('/:sessionId/takeover', requireAuth, takeOverConversation);
router.post('/:sessionId/reply', requireAuth, adminReply);

export default router;