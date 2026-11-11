import type { Request, Response } from 'express';
import type { z } from 'zod';
import bcrypt from 'bcryptjs';
import type {
  loginSchema,
  preferencesUpdateSchema,
  profileUpdateSchema,
  registerSchema,
  savedPassengerSchema,
} from '../validators/auth.js';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
type UserPreferencesUpdate = z.infer<typeof preferencesUpdateSchema>;
type SavedPassengerInput = z.infer<typeof savedPassengerSchema>;
import {
  DEFAULT_USER_PREFERENCES,
  findUserByEmail,
  store,
  toPublicUser,
  type UserRecord,
} from '../database/store.js';
import { requireUser } from '../middleware/auth.js';
import {
  profileResponse,
  seedWelcomeNotifications,
} from '../services/notificationService.js';
import { conflict, notFound, unauthorized, unprocessable } from '../utils/errors.js';
import { randomId } from '../utils/reference.js';
import { nowIso } from '../utils/time.js';
import { signToken } from '../utils/jwt.js';
import { getEmailProvider } from '../integrations/emailProvider.js';

const MIN_PASSWORD_LENGTH = 8;
const MAX_SAVED_PASSENGERS = 20;

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterInput;
  if (body.password.length < MIN_PASSWORD_LENGTH) {
    throw unprocessable('weak_password', `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
  const email = body.email.trim().toLowerCase();
  if (findUserByEmail(email)) {
    throw conflict('email_taken', 'An account with this email already exists.');
  }
  const user: UserRecord = {
    id: randomId('usr'),
    email,
    passwordHash: await bcrypt.hash(body.password, 10),
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    createdAt: nowIso(),
    preferences: structuredClone(DEFAULT_USER_PREFERENCES),
    passengers: [],
  };
  store.users.set(user.id, user);
  store.usersByEmail.set(email, user.id);
  seedWelcomeNotifications(user);
  res.status(201).json({ token: signToken({ sub: user.id, email: user.email }), user: toPublicUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body as LoginInput;
  const user = findUserByEmail(body.email);
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw unauthorized('invalid_credentials', 'Email or password is incorrect.');
  }
  res.json({ token: signToken({ sub: user.id, email: user.email }), user: toPublicUser(user) });
}

export function me(req: Request, res: Response): void {
  res.json(profileResponse(requireUser(req)));
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const body = req.body as { email: string };
  const message =
    'If an account exists for that email, a password reset link is on its way. Check your inbox.';
  const user = findUserByEmail(body.email);
  if (user) {
    await getEmailProvider().send({
      to: user.email,
      subject: 'Reset your SkyVoyage password',
      body: `Hi ${user.firstName}, use this link to reset your password: https://skyvoyage.dev/reset?token=demo-token\n\nDemo data — links are not functional in this build.`,
      kind: 'password_reset',
    });
  }
  res.json({ ok: true, message });
}

export function updateProfile(req: Request, res: Response): void {
  const user = requireUser(req);
  const body = req.body as ProfileUpdateInput;
  if (body.firstName !== undefined) user.firstName = body.firstName.trim();
  if (body.lastName !== undefined) user.lastName = body.lastName.trim();
  res.json(profileResponse(user));
}

export function updatePreferences(req: Request, res: Response): void {
  const user = requireUser(req);
  const patch = req.body as UserPreferencesUpdate;
  const preferences = user.preferences;
  if (patch.currency !== undefined) preferences.currency = patch.currency;
  if (patch.language !== undefined) preferences.language = patch.language;
  if (patch.cabin !== undefined) preferences.cabin = patch.cabin;
  if (patch.distanceUnit !== undefined) preferences.distanceUnit = patch.distanceUnit;
  if (patch.accessibility !== undefined) {
    preferences.accessibility = { ...preferences.accessibility, ...patch.accessibility };
  }
  if (patch.notifications !== undefined) {
    preferences.notifications = { ...preferences.notifications, ...patch.notifications };
  }
  if (patch.favouriteAirlines !== undefined) preferences.favouriteAirlines = [...patch.favouriteAirlines];
  res.json(profileResponse(user));
}

export function addPassenger(req: Request, res: Response): void {
  const user = requireUser(req);
  const body = req.body as SavedPassengerInput;
  if (user.passengers.length >= MAX_SAVED_PASSENGERS) {
    throw unprocessable('passenger_limit', `You can save at most ${MAX_SAVED_PASSENGERS} passengers.`);
  }
  user.passengers.push({ id: randomId('pax'), ...body });
  res.status(201).json(profileResponse(user));
}

export function removePassenger(req: Request, res: Response): void {
  const user = requireUser(req);
  const id = req.params.id;
  const index = user.passengers.findIndex((passenger) => passenger.id === id);
  if (index === -1) throw notFound('passenger_not_found', 'That saved passenger does not exist.');
  user.passengers.splice(index, 1);
  res.json(profileResponse(user));
}
