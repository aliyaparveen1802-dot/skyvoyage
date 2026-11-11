import type { NextFunction, Request, Response } from 'express';
import { store, type UserRecord } from '../database/store.js';
import { unauthorized } from '../utils/errors.js';
import { verifyToken } from '../utils/jwt.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { userId: string };
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function resolveUser(req: Request): UserRecord | undefined {
  const token = extractToken(req);
  if (!token) return undefined;
  try {
    const payload = verifyToken(token);
    const user = store.users.get(payload.sub);
    if (!user) return undefined;
    req.auth = { userId: user.id };
    return user;
  } catch {
    return undefined;
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const user = resolveUser(req);
  if (!user) {
    next(unauthorized('unauthorized', 'Sign in to access this resource.'));
    return;
  }
  next();
}

export const requireAuth = authenticate;

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  resolveUser(req);
  next();
}

export function currentUser(req: Request): UserRecord | undefined {
  if (!req.auth) return undefined;
  return store.users.get(req.auth.userId);
}

export function requireUser(req: Request): UserRecord {
  const user = currentUser(req);
  if (!user) throw unauthorized('unauthorized', 'Sign in to access this resource.');
  return user;
}
