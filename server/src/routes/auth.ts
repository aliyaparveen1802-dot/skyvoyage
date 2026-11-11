import { Router } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  passengerIdParamSchema,
  preferencesUpdateSchema,
  profileUpdateSchema,
  registerSchema,
  savedPassengerSchema,
} from '../validators/auth.js';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { authRateLimit } from '../middleware/rateLimits.js';

const router = Router();

router.use(authRateLimit);
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.get('/me', authenticate, authController.me);
router.put('/profile', authenticate, validateBody(profileUpdateSchema), authController.updateProfile);
router.put('/preferences', authenticate, validateBody(preferencesUpdateSchema), authController.updatePreferences);
router.post('/passengers', authenticate, validateBody(savedPassengerSchema), authController.addPassenger);
router.delete(
  '/passengers/:id',
  authenticate,
  validateParams(passengerIdParamSchema),
  authController.removePassenger,
);

export default router;
