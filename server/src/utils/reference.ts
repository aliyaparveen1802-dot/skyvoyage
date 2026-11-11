import { randomBytes, randomUUID } from 'node:crypto';

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}

export function randomReference(): string {
  const bytes = randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return out;
}

export function uuid(): string {
  return randomUUID();
}
