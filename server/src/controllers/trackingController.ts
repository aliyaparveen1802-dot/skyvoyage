import type { Request, Response } from 'express';
import type { z } from 'zod';
import type {
  bookingTrackingQuerySchema,
  flightTrackingQuerySchema,
} from '../validators/trips.js';
import { requireUser } from '../middleware/auth.js';
import { getFlightTrackingProvider } from '../integrations/flightTrackingProvider.js';
import { flightSegmentForBooking } from '../services/bookingService.js';
import { notFound } from '../utils/errors.js';

type FlightQuery = z.infer<typeof flightTrackingQuerySchema>;
type BookingQuery = z.infer<typeof bookingTrackingQuerySchema>;

export function trackFlight(req: Request, res: Response): void {
  const query = req.validatedQuery as FlightQuery;
  const tracking = getFlightTrackingProvider().trackByFlight(query.flight, query.date);
  if (!tracking) {
    throw notFound('flight_not_found', 'We could not find that flight number in the demo schedule.');
  }
  res.json(tracking);
}

export function trackBooking(req: Request, res: Response): void {
  const user = requireUser(req);
  const query = req.validatedQuery as BookingQuery;
  const segment = flightSegmentForBooking(user, query.reference);
  if (!segment) {
    res.json(null);
    return;
  }
  const tracking = getFlightTrackingProvider().trackByFlight(
    segment.flightNumber,
    segment.departureAt.slice(0, 10),
  );
  res.json(tracking);
}
