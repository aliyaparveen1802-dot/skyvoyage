import { ApiError, paymentRequired, unprocessable } from '../utils/errors.js';
import { randomId } from '../utils/reference.js';

export interface CardInput {
  number: string;
  name: string;
  expiry: string;
  cvc: string;
}

export interface PaymentRequest {
  method: 'card' | 'wallet';
  card?: CardInput;
}

export interface PaymentResult {
  status: 'captured';
  transactionId: string;
}

export interface PaymentProvider {
  capture(request: PaymentRequest): Promise<PaymentResult>;
}

const DECLINE_NUMBERS = new Set(['4000000000000002', '4000000000000069', '4000000000000127']);

export function luhnValid(number: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = number.charCodeAt(i) - 48;
    if (digit < 0 || digit > 9) return false;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function validateCard(card: CardInput): string {
  const digits = card.number.replace(/[\s-]/g, '');
  if (!/^\d{12,19}$/.test(digits)) {
    throw unprocessable('invalid_card', 'Enter a valid card number.');
  }
  if (!luhnValid(digits)) {
    throw unprocessable('invalid_card', 'Card number failed the checksum check.');
  }
  const expiryMatch = /^(\d{2})\s*\/\s*(\d{2}|\d{4})$/.exec(card.expiry.trim());
  if (!expiryMatch) {
    throw unprocessable('invalid_card', 'Expiry must be in MM/YY format.');
  }
  const month = Number(expiryMatch[1]);
  const year = Number(expiryMatch[2].length === 2 ? `20${expiryMatch[2]}` : expiryMatch[2]);
  if (month < 1 || month > 12) {
    throw unprocessable('invalid_card', 'Expiry month must be between 01 and 12.');
  }
  const now = new Date();
  const endOfMonth = Date.UTC(year, month, 1) - 1;
  if (endOfMonth < now.getTime()) {
    throw unprocessable('invalid_card', 'Card has expired.');
  }
  if (!/^\d{3,4}$/.test(card.cvc.trim())) {
    throw unprocessable('invalid_card', 'Security code must be 3 or 4 digits.');
  }
  if (!card.name.trim()) {
    throw unprocessable('invalid_card', 'Cardholder name is required.');
  }
  return digits;
}

export class MockPaymentProvider implements PaymentProvider {
  async capture(request: PaymentRequest): Promise<PaymentResult> {
    if (request.method === 'wallet') {
      return { status: 'captured', transactionId: randomId('pay') };
    }
    if (!request.card) {
      throw new ApiError(400, 'validation_error', 'Card details are required for card payments.');
    }
    const digits = validateCard(request.card);
    if (DECLINE_NUMBERS.has(digits)) {
      throw paymentRequired('payment_declined', 'Your card was declined by the payment gateway. Try another card.');
    }
    return { status: 'captured', transactionId: randomId('pay') };
  }
}

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER;
  if (configured && configured !== 'mock') {
    throw new Error(`Unsupported payment provider: ${configured}`);
  }
  return new MockPaymentProvider();
}
