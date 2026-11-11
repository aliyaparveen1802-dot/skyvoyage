import { z } from 'zod';
import { bookingReferenceSchema, isoDateSchema } from './common.js';

export const seatSelectionSchema = z.object({
  segmentId: z.string().trim().min(1).max(64),
  passengerIndex: z.number().int().min(0).max(8),
  seatId: z.string().trim().regex(/^\d{1,2}[A-F]$/, 'Seat id must look like 12A'),
});

export const addonsSchema = z.object({
  extraBaggageKg: z.number().int().min(0).max(40),
  seatSelection: z.boolean(),
  meal: z.enum(['none', 'standard', 'vegetarian', 'vegan', 'halal', 'kosher']),
  specialAssistance: z.enum(['none', 'wheelchair', 'visual', 'hearing', 'medical']),
  priorityBoarding: z.boolean(),
  travelInsurance: z.boolean(),
});

export const passengerInputSchema = z.object({
  type: z.enum(['adult', 'child', 'infant']),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  dateOfBirth: isoDateSchema.optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  passportNumber: z.string().trim().max(20).optional(),
  passportExpiry: isoDateSchema.optional(),
  nationality: z.string().trim().max(60).optional(),
  email: z.email().optional(),
  phone: z.string().trim().max(20).optional(),
});

export const quoteRequestSchema = z.object({
  searchId: z.string().trim().min(1).max(64),
  offerId: z.string().trim().min(1).max(64),
  seats: z.array(seatSelectionSchema).max(54),
  addons: addonsSchema,
  passengers: z.array(passengerInputSchema).min(1).max(9),
});

export const confirmPaymentSchema = z
  .object({
    method: z.enum(['card', 'wallet']),
    card: z
      .object({
        number: z.string().trim().min(12).max(23),
        name: z.string().trim().min(1).max(80),
        expiry: z.string().trim().min(4).max(7),
        cvc: z.string().trim().min(3).max(4),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === 'card' && !value.card) {
      ctx.addIssue({ code: 'custom', message: 'Card details are required for card payments.', path: ['card'] });
    }
  });

export const referenceParamsSchema = z.object({
  reference: bookingReferenceSchema,
});

export const quoteParamsSchema = z.object({
  quoteId: z.string().trim().min(1).max(64),
});
