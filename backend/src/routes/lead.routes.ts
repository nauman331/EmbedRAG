import { Router } from 'express';
import { getLeads } from '../controllers/lead.controller';

const router = Router();

router.get('/:botId', getLeads);

export default router;