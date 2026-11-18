export type EmailAttachment = {
  readonly filename: string;
  /** Base64-encoded file content, as the transport expects it. */
  readonly content: string;
  readonly contentType: string;
};

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Omitted entirely when the message carries no files. */
  attachments?: readonly EmailAttachment[];
}

/**
 * Port for sending transactional emails.
 * Implementations decide the transport (Resend, console, no-op).
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
