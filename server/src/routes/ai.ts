import { Router } from 'express';
import { waitingAdviceSchema } from '../validators/airport.js';
import * as airportController from '../controllers/airportController.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/waiting-advice', validateBody(waitingAdviceSchema), airportController.advice);

export default router;
