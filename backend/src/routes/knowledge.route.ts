import { Router } from 'express';
import { upload, uploadKnowledge, getKnowledgeSources, deleteKnowledgeSource } from '../controllers/knowledge.controller.js';
import { requireAuth, requireBotOwnership } from '../middlewares/auth.middleware.js';

const router = Router();

// All knowledge operations require auth.
// - upload: uses botId from req.body — ownership checked inside controller against req.user
// - list & delete: use botId / sourceId in URL params — ownership enforced by middleware
router.post('/upload', requireAuth, upload.single('file'), uploadKnowledge);
router.get('/:botId', requireAuth, requireBotOwnership, getKnowledgeSources);
router.delete('/:sourceId', requireAuth, deleteKnowledgeSource);

export default router;