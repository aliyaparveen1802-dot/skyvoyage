import { z } from 'zod';
import { bookingReferenceSchema, iataSchema, isoDateTimeSchema } from './common.js';

export const guideParamsSchema = z.object({
  airport: iataSchema,
  bookingReference: bookingReferenceSchema.optional(),
});

export const guideProgressSchema = z.object({
  bookingReference: bookingReferenceSchema,
  airport: iataSchema,
  stageId: z.enum([
    'arrival',
    'terminal',
    'entrance',
    'checkin',
    'baggage',
    'security',
    'immigration',
    'gate',
    'queue',
    'boarding',
  ]),
  done: z.boolean(),
});

export const facilitiesQuerySchema = z.object({
  airport: iataSchema,
  category: z
    .enum(['all', 'hotel', 'lounge', 'dining', 'shopping', 'wellness', 'worship', 'services', 'medical'])
    .optional(),
  q: z.string().trim().max(80).optional(),
});

export const waitingAdviceSchema = z.object({
  airport: iataSchema,
  terminal: z.string().trim().min(1).max(20),
  boardingAt: isoDateTimeSchema,
  gate: z.string().trim().max(10).nullable().optional(),
  bookingReference: bookingReferenceSchema.optional(),
});
