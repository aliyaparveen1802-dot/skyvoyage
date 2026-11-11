import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'dev-secret-change-me';
const DEFAULT_EXPIRES_IN = '7d';

export interface TokenPayload {
  sub: string;
  email: string;
}

function secret(): string {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

function expiresIn(): string {
  return process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: expiresIn() as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, secret());
  if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
    throw new Error('Invalid token payload');
  }
  const sub = decoded.sub;
  const email = decoded.email;
  if (typeof sub !== 'string' || typeof email !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { sub, email };
}
