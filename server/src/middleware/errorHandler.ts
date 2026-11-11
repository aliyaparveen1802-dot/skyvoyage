import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/errors.js';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ErrorBody = {
    error: { code: 'not_found', message: 'The requested endpoint does not exist.' },
  };
  res.status(404).json(body);
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  void next;
  if (res.headersSent) return;
  if (err instanceof ApiError) {
    const body: ErrorBody = { error: { code: err.code, message: err.message } };
    if (err.details !== undefined) body.error.details = err.details;
    res.status(err.status).json(body);
    return;
  }
  const body: ErrorBody = {
    error: { code: 'internal_error', message: 'Something went wrong on the server. Please try again.' },
  };
  res.status(500).json(body);
}
