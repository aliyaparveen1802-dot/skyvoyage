import { z } from 'zod';
import { bookingReferenceSchema, notificationPreferencesSchema } from './common.js';

export const notificationIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
});

export const notificationPreferencesBodySchema = notificationPreferencesSchema;

export const flightTrackingQuerySchema = z.object({
  flight: z.string().trim().min(3).max(10),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
});

export const bookingTrackingQuerySchema = z.object({
  reference: bookingReferenceSchema,
});

export const saveFlightSchema = z.object({
  searchId: z.string().trim().min(1).max(64),
  offerId: z.string().trim().min(1).max(64),
});

export const savedFlightParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
});
