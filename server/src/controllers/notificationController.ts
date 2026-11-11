import type { Request, Response } from 'express';
import type { z } from 'zod';
import type {
  notificationIdParamsSchema,
  notificationPreferencesBodySchema,
} from '../validators/trips.js';
import { requireUser } from '../middleware/auth.js';
import {
  getPreferences,
  listNotifications,
  markAllRead,
  markRead,
  updatePreferences,
} from '../services/notificationService.js';

type NotificationParams = z.infer<typeof notificationIdParamsSchema>;
type PreferencesBody = z.infer<typeof notificationPreferencesBodySchema>;

export function list(req: Request, res: Response): void {
  res.json(listNotifications(requireUser(req)));
}

export function read(req: Request, res: Response): void {
  const user = requireUser(req);
  const params = req.params as unknown as NotificationParams;
  res.json(markRead(user, params.id));
}

export function readAll(req: Request, res: Response): void {
  res.json(markAllRead(requireUser(req)));
}

export function preferences(req: Request, res: Response): void {
  res.json(getPreferences(requireUser(req)));
}

export function updatePrefs(req: Request, res: Response): void {
  const user = requireUser(req);
  const body = req.body as PreferencesBody;
  res.json(updatePreferences(user, body));
}
