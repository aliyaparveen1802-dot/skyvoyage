import { store } from '../database/store.js';
import { randomId } from '../utils/reference.js';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  kind: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export class OutboxEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    store.outbox.unshift({
      id: randomId('msg'),
      to: message.to,
      subject: message.subject,
      body: message.body,
      kind: message.kind,
      createdAt: new Date().toISOString(),
    });
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!provider) provider = new OutboxEmailProvider();
  return provider;
}
