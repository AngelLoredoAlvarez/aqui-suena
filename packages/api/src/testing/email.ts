import type { EmailMessage, EmailSender } from "@aqui-suena/api/domain/email/email";

/**
 * Test double that captures sent messages for assertions.
 * Lives outside `domain/` so production imports of the port never pull it in.
 */
export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
