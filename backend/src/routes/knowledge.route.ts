import { Router } from 'express';
import { upload, uploadKnowledge } from '../controllers/knowledge.controller';

const router = Router();

router.post('/upload', upload.single('file'), uploadKnowledge);

export default router;