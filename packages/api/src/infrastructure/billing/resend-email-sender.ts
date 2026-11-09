import type { EmailMessage, EmailSender } from "@aqui-suena/api/domain/billing/email";

const RESEND_API_URL = "https://api.resend.com/emails";

export interface ResendEmailSenderOptions {
  apiKey: string;
  from: string;
  fetchFn?: typeof fetch;
}

/**
 * Sends transactional emails through the Resend HTTP API.
 * Uses fetch (available in Node 18+ and Cloudflare Workers) so no
 * extra dependency is needed.
 */
export class ResendEmailSender implements EmailSender {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: ResendEmailSenderOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async send(message: EmailMessage): Promise<void> {
    const response = await this.fetchFn(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        from: this.options.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend API error ${response.status}: ${text}`);
    }
  }
}
