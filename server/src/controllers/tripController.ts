import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { saveFlightSchema, savedFlightParamsSchema } from '../validators/trips.js';
import { requireUser } from '../middleware/auth.js';
import { getSearch } from '../services/searchService.js';
import { notFound } from '../utils/errors.js';
import { randomId } from '../utils/reference.js';
import { nowIso } from '../utils/time.js';
import type { SavedFlight } from '../types.js';
import { store } from '../database/store.js';

type SaveBody = z.infer<typeof saveFlightSchema>;
type SavedParams = z.infer<typeof savedFlightParamsSchema>;

export function list(req: Request, res: Response): void {
  const user = requireUser(req);
  res.json({ flights: store.savedFlights.get(user.id) ?? [] });
}

export function save(req: Request, res: Response): void {
  const user = requireUser(req);
  const body = req.body as SaveBody;
  const search = getSearch(body.searchId);
  const offer = search.offers.find((candidate) => candidate.id === body.offerId);
  if (!offer) {
    throw notFound('offer_not_found', 'That fare could not be found — please run a new search.');
  }
  const existing = store.savedFlights.get(user.id) ?? [];
  const duplicate = existing.find((flight) => flight.offerId === offer.id);
  if (duplicate) {
    res.json({ flights: existing, saved: duplicate });
    return;
  }
  const first = offer.legs[0].segments[0];
  const lastLeg = offer.legs[offer.legs.length - 1];
  const last = lastLeg.segments[lastLeg.segments.length - 1];
  const saved: SavedFlight = {
    id: randomId('sav'),
    offerId: offer.id,
    flightNumber: first.flightNumber,
    routeLabel: `${first.from.iata} → ${last.to.iata}`,
    departureAt: first.departureAt,
    price: offer.price.total,
    currency: offer.price.currency,
    createdAt: nowIso(),
  };
  const flights = [saved, ...existing];
  store.savedFlights.set(user.id, flights);
  res.status(201).json({ flights, saved });
}

export function remove(req: Request, res: Response): void {
  const user = requireUser(req);
  const params = req.params as unknown as SavedParams;
  const flights = store.savedFlights.get(user.id) ?? [];
  const next = flights.filter((flight) => flight.id !== params.id);
  if (next.length === flights.length) {
    throw notFound('saved_flight_not_found', 'That saved flight does not exist.');
  }
  store.savedFlights.set(user.id, next);
  res.json({ flights: next });
}
