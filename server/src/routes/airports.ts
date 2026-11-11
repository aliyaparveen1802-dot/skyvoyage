import { Router } from 'express';
import { airportsQuerySchema } from '../validators/flights.js';
import * as flightController from '../controllers/flightController.js';
import { validateQuery } from '../middleware/validate.js';

const router = Router();

router.get('/', validateQuery(airportsQuerySchema), flightController.airports);

export default router;
