import { Router } from 'express';
import {
  calendarSchema,
  flightSearchSchema,
  offerParamsSchema,
  seatsQuerySchema,
  segmentParamsSchema,
} from '../validators/flights.js';
import * as flightController from '../controllers/flightController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';

const router = Router();

router.post('/search', optionalAuth, validateBody(flightSearchSchema), flightController.search);
router.get(
  '/search/:searchId/offers/:offerId',
  validateParams(offerParamsSchema),
  flightController.offerDetail,
);
router.get(
  '/search/:searchId/offers/:offerId/segments/:segmentId/seats',
  validateParams(segmentParamsSchema),
  validateQuery(seatsQuerySchema),
  flightController.seats,
);
router.post('/calendar', validateBody(calendarSchema), flightController.calendar);

export default router;
