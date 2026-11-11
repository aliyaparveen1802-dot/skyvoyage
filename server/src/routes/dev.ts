import { Router } from 'express';
import * as devController from '../controllers/devController.js';

const router = Router();

router.get('/outbox', devController.outbox);
router.get('/health', devController.health);

export default router;
