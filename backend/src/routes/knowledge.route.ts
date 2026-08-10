import { Router } from 'express';
import { upload, uploadKnowledge, getKnowledgeSources, deleteKnowledgeSource } from '../controllers/knowledge.controller';

const router = Router();

router.post('/upload', upload.single('file'), uploadKnowledge);
router.get('/:botId', getKnowledgeSources);
router.delete('/:sourceId', deleteKnowledgeSource);

export default router;