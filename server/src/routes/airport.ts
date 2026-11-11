import { Router } from 'express';
import {
  facilitiesQuerySchema,
  guideParamsSchema,
  guideProgressSchema,
} from '../validators/airport.js';
import * as airportController from '../controllers/airportController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';

const router = Router();

router.get('/guide', optionalAuth, validateQuery(guideParamsSchema), airportController.guide);
router.post('/guide', optionalAuth, validateBody(guideParamsSchema), airportController.guide);
router.post(
  '/guide/progress',
  authenticate,
  validateBody(guideProgressSchema),
  airportController.progress,
);
router.get('/facilities', validateQuery(facilitiesQuerySchema), airportController.facilities);

export default router;
