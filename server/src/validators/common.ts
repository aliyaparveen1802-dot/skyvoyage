import { z } from 'zod';
import { todayUtc } from '../utils/time.js';

export const iataSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'Must be a 3-letter IATA code')
  .transform((value) => value.toUpperCase());

export const cabinSchema = z.enum(['economy', 'premium', 'business', 'first']);

export const passengerTypeSchema = z.enum(['adult', 'child', 'infant']);

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => value >= todayUtc(), 'Date cannot be in the past');

export const anyDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const isoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date-time');

export const bookingReferenceSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{6}$/, 'Booking reference must be 6 characters')
  .transform((value) => value.toUpperCase());

export const notificationPreferencesSchema = z.object({
  push: z.boolean(),
  email: z.boolean(),
  gateChanges: z.boolean(),
  boarding: z.boolean(),
  delays: z.boolean(),
  promotions: z.boolean(),
});
