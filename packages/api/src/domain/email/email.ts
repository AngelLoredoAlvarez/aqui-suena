export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Port for sending transactional emails.
 * Implementations decide the transport (Resend, console, no-op).
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Test double that captures sent messages for assertions.
 */
export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
