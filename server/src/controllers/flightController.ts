import type { Request, Response } from 'express';
import type { z } from 'zod';
import type {
  airportsQuerySchema,
  calendarSchema,
  flightSearchSchema,
  segmentParamsSchema,
} from '../validators/flights.js';
import { offerParamsSchema } from '../validators/flights.js';
import { buildSeatMap } from '../services/seatService.js';
import {
  createSearch,
  getOffer,
  getSegment,
  priceCalendar,
  searchAirports,
} from '../services/searchService.js';
import { currentUser } from '../middleware/auth.js';

type SearchBody = z.infer<typeof flightSearchSchema>;
type CalendarBody = z.infer<typeof calendarSchema>;
type AirportsQuery = z.infer<typeof airportsQuerySchema>;
type OfferParams = z.infer<typeof offerParamsSchema>;
type SegmentParams = z.infer<typeof segmentParamsSchema>;

export function search(req: Request, res: Response): void {
  const body = req.body as SearchBody;
  const user = currentUser(req);
  res.json(createSearch(body, user?.id ?? null));
}

export function offerDetail(req: Request, res: Response): void {
  const params = req.params as unknown as OfferParams;
  const { offer, search } = getOffer(params.searchId, params.offerId);
  res.json({ offer, searchId: search.id });
}

export function seats(req: Request, res: Response): void {
  const params = req.params as unknown as SegmentParams;
  const segment = getSegment(params.searchId, params.offerId, params.segmentId);
  res.json(buildSeatMap(segment));
}

export function calendar(req: Request, res: Response): void {
  const body = req.body as CalendarBody;
  res.json({
    days: priceCalendar(body.from, body.to, body.month, body.cabin),
    source: 'mock',
    estimated: true,
  });
}

export function airports(req: Request, res: Response): void {
  const query = req.validatedQuery as AirportsQuery;
  res.json({ airports: searchAirports(query.q) });
}
