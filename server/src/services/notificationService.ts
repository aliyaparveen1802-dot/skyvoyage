import type { AppNotification, NotificationPreferences, NotificationType, User } from '../types.js';
import { pushNotification, store, toPublicUser, type UserRecord } from '../database/store.js';
import { notFound } from '../utils/errors.js';
import { randomId } from '../utils/reference.js';
import { nowIso } from '../utils/time.js';

function createNotification(
  type: NotificationType,
  title: string,
  body: string,
  href?: string,
): AppNotification {
  return {
    id: randomId('ntf'),
    type,
    title,
    body,
    read: false,
    createdAt: nowIso(),
    ...(href ? { href } : {}),
  };
}

export function seedWelcomeNotifications(user: UserRecord): void {
  const seeds: AppNotification[] = [
    createNotification(
      'checkin_available',
      `Welcome to SkyVoyage, ${user.firstName}`,
      'Your demo account is ready — search flights, pick seats and explore airport guides. Demo data: no real tickets are issued.',
      '/search',
    ),
    createNotification(
      'checkin_reminder',
      'Check-in tips for your first trip',
      'Check-in opens 24 hours before departure. Keep your passport handy and arrive early — tips are demo content for this build.',
      '/help',
    ),
    createNotification(
      'flight_delayed',
      'Price alert (Demo data)',
      'Fares on MAA → DXB are trending lower in this demo dataset. Run a search to compare indicative prices.',
      '/search',
    ),
    createNotification(
      'gate_assigned',
      'Gate alerts enabled (Demo data)',
      'We will notify you when a gate is assigned. Gate values in this build are demo values from the mock provider.',
      '/notifications',
    ),
  ];
  for (const notification of seeds) pushNotification(user.id, notification);
}

export function listNotifications(user: UserRecord): { notifications: AppNotification[]; unread: number } {
  const notifications = store.notifications.get(user.id) ?? [];
  return { notifications, unread: notifications.filter((notification) => !notification.read).length };
}

export function markRead(user: UserRecord, id: string): { unread: number } {
  const notifications = store.notifications.get(user.id) ?? [];
  const target = notifications.find((notification) => notification.id === id);
  if (!target) throw notFound('notification_not_found', 'That notification does not exist.');
  target.read = true;
  return { unread: notifications.filter((notification) => !notification.read).length };
}

export function markAllRead(user: UserRecord): { unread: number } {
  const notifications = store.notifications.get(user.id) ?? [];
  for (const notification of notifications) notification.read = true;
  return { unread: 0 };
}

export function getPreferences(user: UserRecord): { preferences: NotificationPreferences } {
  return { preferences: user.preferences.notifications };
}

export function updatePreferences(
  user: UserRecord,
  preferences: NotificationPreferences,
): { preferences: NotificationPreferences } {
  user.preferences.notifications = { ...preferences };
  return { preferences: user.preferences.notifications };
}

export function profileResponse(user: UserRecord): {
  user: User;
  preferences: UserRecord['preferences'];
  passengers: UserRecord['passengers'];
} {
  return {
    user: toPublicUser(user),
    preferences: user.preferences,
    passengers: user.passengers,
  };
}
