import { rateLimit } from 'express-rate-limit';

const envelope = {
  error: {
    code: 'rate_limited',
    message: 'Too many requests. Please wait a moment and try again.',
  },
};

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: envelope,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: envelope,
});
