import { z } from 'zod';
import { cabinSchema, iataSchema, isoDateSchema } from './common.js';

export const flightSearchSchema = z
  .object({
    tripType: z.enum(['oneway', 'roundtrip', 'multicity']),
    legs: z
      .array(z.object({ from: iataSchema, to: iataSchema, date: isoDateSchema }))
      .min(1)
      .max(6),
    passengers: z.object({
      adult: z.number().int().min(1).max(9),
      child: z.number().int().min(0).max(9),
      infant: z.number().int().min(0).max(9),
    }),
    cabin: cabinSchema,
  })
  .superRefine((value, ctx) => {
    const total = value.passengers.adult + value.passengers.child + value.passengers.infant;
    if (total > 9) {
      ctx.addIssue({ code: 'custom', message: 'A search can include at most 9 passengers.', path: ['passengers'] });
    }
    if (value.passengers.infant > value.passengers.adult) {
      ctx.addIssue({ code: 'custom', message: 'Each infant must be accompanied by an adult.', path: ['passengers', 'infant'] });
    }
    const expectedLegs = value.tripType === 'oneway' ? 1 : value.tripType === 'roundtrip' ? 2 : null;
    if (expectedLegs !== null && value.legs.length !== expectedLegs) {
      ctx.addIssue({ code: 'custom', message: `${value.tripType} searches require exactly ${expectedLegs} leg(s).`, path: ['legs'] });
    }
    if (value.tripType === 'multicity' && value.legs.length < 2) {
      ctx.addIssue({ code: 'custom', message: 'Multi-city searches require at least 2 legs.', path: ['legs'] });
    }
    value.legs.forEach((leg, index) => {
      if (leg.from === leg.to) {
        ctx.addIssue({ code: 'custom', message: 'Origin and destination must differ.', path: ['legs', index] });
      }
    });
  });

export const offerParamsSchema = z.object({
  searchId: z.string().min(1).max(64),
  offerId: z.string().min(1).max(64),
});

export const segmentParamsSchema = offerParamsSchema.extend({
  segmentId: z.string().min(1).max(64),
});

export const seatsQuerySchema = z.object({
  passengers: z.coerce.number().int().min(1).max(9).optional(),
});

export const calendarSchema = z.object({
  from: iataSchema,
  to: iataSchema,
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM'),
  cabin: cabinSchema,
});

export const airportsQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
});
