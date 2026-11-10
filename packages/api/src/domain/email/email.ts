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
