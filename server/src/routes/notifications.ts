import { Router } from 'express';
import {
  notificationIdParamsSchema,
  notificationPreferencesBodySchema,
} from '../validators/trips.js';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, notificationController.list);
router.post('/read-all', authenticate, notificationController.readAll);
router.post(
  '/:id/read',
  authenticate,
  validateParams(notificationIdParamsSchema),
  notificationController.read,
);
router.get('/preferences', authenticate, notificationController.preferences);
router.put(
  '/preferences',
  authenticate,
  validateBody(notificationPreferencesBodySchema),
  notificationController.updatePrefs,
);

export default router;
