import { Router } from 'express';
import { getConversations, takeOverConversation, adminReply } from '../controllers/conversation.controller';

const router = Router();

router.get('/:botId', getConversations);
router.post('/:sessionId/takeover', takeOverConversation);
router.post('/:sessionId/reply', adminReply);

export default router;