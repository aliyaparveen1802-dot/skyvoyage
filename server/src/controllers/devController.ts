import type { Request, Response } from 'express';
import { store } from '../database/store.js';

const OUTBOX_NOTE = 'Emails are not sent in this demo — they are stored here instead.';

export function outbox(_req: Request, res: Response): void {
  res.json({ messages: store.outbox, note: OUTBOX_NOTE });
}

export function health(_req: Request, res: Response): void {
  res.json({ ok: true, uptime: Math.round(process.uptime() * 1000) / 1000 });
}
