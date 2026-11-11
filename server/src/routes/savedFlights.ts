import { Router } from 'express';
import { saveFlightSchema, savedFlightParamsSchema } from '../validators/trips.js';
import * as tripController from '../controllers/tripController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, tripController.list);
router.post('/', authenticate, validateBody(saveFlightSchema), tripController.save);
router.delete('/:id', authenticate, validateParams(savedFlightParamsSchema), tripController.remove);

export default router;
