import { Router } from 'express';
import { bookingTrackingQuerySchema, flightTrackingQuerySchema } from '../validators/trips.js';
import * as trackingController from '../controllers/trackingController.js';
import { authenticate } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';

const router = Router();

router.get('/flight', validateQuery(flightTrackingQuerySchema), trackingController.trackFlight);
router.get(
  '/booking',
  authenticate,
  validateQuery(bookingTrackingQuerySchema),
  trackingController.trackBooking,
);

export default router;
