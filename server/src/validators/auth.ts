import { z } from 'zod';
import { cabinSchema, notificationPreferencesSchema, passengerTypeSchema } from './common.js';

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  email: z.email().optional(),
});

export const preferencesUpdateSchema = z.object({
  currency: z.string().trim().min(3).max(8).optional(),
  language: z.string().trim().min(2).max(8).optional(),
  cabin: cabinSchema.optional(),
  distanceUnit: z.enum(['km', 'mi']).optional(),
  accessibility: z
    .object({
      reduceMotion: z.boolean().optional(),
      largeText: z.boolean().optional(),
      highContrast: z.boolean().optional(),
      voiceInstructions: z.boolean().optional(),
    })
    .optional(),
  notifications: notificationPreferencesSchema.partial().optional(),
  favouriteAirlines: z.array(z.string().trim().min(2).max(10)).max(20).optional(),
});

export const savedPassengerSchema = z.object({
  type: passengerTypeSchema,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  passportNumber: z.string().trim().max(20).optional(),
  nationality: z.string().trim().max(60).optional(),
});

export const passengerIdParamSchema = z.object({
  id: z.string().min(1).max(64),
});
