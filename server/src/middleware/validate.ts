import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../utils/errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    validatedQuery?: unknown;
  }
}

function parse(schema: ZodType, value: unknown): unknown {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw badRequest('validation_error', 'Request validation failed.', result.error.issues);
  }
  return result.data;
}

export function validateBody(schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = parse(schema, req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery(schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.validatedQuery = parse(schema, req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateParams(schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = parse(schema, req.params) as Request['params'];
      next();
    } catch (error) {
      next(error);
    }
  };
}
