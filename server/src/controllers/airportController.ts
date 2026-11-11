import type { Request, Response } from 'express';
import type { z } from 'zod';
import type {
  facilitiesQuerySchema,
  guideParamsSchema,
  guideProgressSchema,
  waitingAdviceSchema,
} from '../validators/airport.js';
import { currentUser, requireUser } from '../middleware/auth.js';
import { buildGuide, updateProgress } from '../services/guideService.js';
import { listFacilities } from '../services/facilityService.js';
import { waitingAdvice } from '../services/adviceService.js';

type GuideParams = z.infer<typeof guideParamsSchema>;
type ProgressBody = z.infer<typeof guideProgressSchema>;
type FacilitiesQuery = z.infer<typeof facilitiesQuerySchema>;
type AdviceBody = z.infer<typeof waitingAdviceSchema>;

export function guide(req: Request, res: Response): void {
  const input = (req.method === 'POST' ? req.body : req.validatedQuery) as GuideParams;
  res.json(buildGuide(currentUser(req), input.airport, input.bookingReference));
}

export function progress(req: Request, res: Response): void {
  const user = requireUser(req);
  const body = req.body as ProgressBody;
  res.json(updateProgress(user, body));
}

export function facilities(req: Request, res: Response): void {
  const query = req.validatedQuery as FacilitiesQuery;
  res.json({
    facilities: listFacilities(query.airport, query.category, query.q),
    source: 'mock',
    currency: 'INR',
  });
}

export async function advice(req: Request, res: Response): Promise<void> {
  const body = req.body as AdviceBody;
  res.json(await waitingAdvice(body));
}
