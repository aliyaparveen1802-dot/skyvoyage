import { Router } from 'express';
import {
  confirmPaymentSchema,
  quoteParamsSchema,
  quoteRequestSchema,
  referenceParamsSchema,
} from '../validators/bookings.js';
import * as bookingController from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = Router();

router.post('/quote', authenticate, validateBody(quoteRequestSchema), bookingController.quote);
router.get('/', authenticate, bookingController.list);
router.post(
  '/:quoteId/confirm-payment',
  authenticate,
  validateParams(quoteParamsSchema),
  validateBody(confirmPaymentSchema),
  bookingController.confirm,
);
router.get('/:reference', authenticate, validateParams(referenceParamsSchema), bookingController.get);
router.get(
  '/:reference/boarding-passes',
  authenticate,
  validateParams(referenceParamsSchema),
  bookingController.boardingPasses,
);
router.post(
  '/:reference/cancel',
  authenticate,
  validateParams(referenceParamsSchema),
  bookingController.cancel,
);
router.post(
  '/:reference/email-ticket',
  authenticate,
  validateParams(referenceParamsSchema),
  bookingController.emailTicketRoute,
);
router.get(
  '/:reference/calendar-events',
  authenticate,
  validateParams(referenceParamsSchema),
  bookingController.calendarRoute,
);

export default router;
