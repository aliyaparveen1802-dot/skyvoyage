import type { Request, Response } from 'express';
import type { z } from 'zod';
import type {
  confirmPaymentSchema,
  quoteRequestSchema,
  quoteParamsSchema,
  referenceParamsSchema,
} from '../validators/bookings.js';
import { requireUser } from '../middleware/auth.js';
import {
  calendarEvents,
  cancelBooking,
  confirmPayment,
  createQuote,
  emailTicket,
  getBoardingPasses,
  getBooking,
  listBookings,
} from '../services/bookingService.js';

type QuoteBody = z.infer<typeof quoteRequestSchema>;
type ConfirmBody = z.infer<typeof confirmPaymentSchema>;
type QuoteParams = z.infer<typeof quoteParamsSchema>;
type ReferenceParams = z.infer<typeof referenceParamsSchema>;

export function quote(req: Request, res: Response): void {
  const user = requireUser(req);
  const body = req.body as QuoteBody;
  res.status(201).json(createQuote(user, body));
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const params = req.params as unknown as QuoteParams;
  const body = req.body as ConfirmBody;
  res.json(await confirmPayment(user, params.quoteId, body));
}

export function list(req: Request, res: Response): void {
  const user = requireUser(req);
  res.json({ bookings: listBookings(user) });
}

export function get(req: Request, res: Response): void {
  const user = requireUser(req);
  const params = req.params as unknown as ReferenceParams;
  res.json({ booking: getBooking(user, params.reference) });
}

export function boardingPasses(req: Request, res: Response): void {
  const user = requireUser(req);
  const params = req.params as unknown as ReferenceParams;
  res.json({ passes: getBoardingPasses(user, params.reference) });
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const params = req.params as unknown as ReferenceParams;
  res.json({ booking: await cancelBooking(user, params.reference) });
}

export async function emailTicketRoute(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const params = req.params as unknown as ReferenceParams;
  res.json(await emailTicket(user, params.reference));
}

export function calendarRoute(req: Request, res: Response): void {
  const user = requireUser(req);
  const params = req.params as unknown as ReferenceParams;
  res.json({ events: calendarEvents(user, params.reference) });
}
