import type { EmailSender } from "@aqui-suena/api/domain/email/email";
import type {
  EmailLocale,
  EmailTemplateId,
  EmailTemplateRenderer,
  EmailTemplateVars,
} from "@aqui-suena/api/domain/email/email-template";

export interface TemplateEmailRecipient {
  readonly email: string;
  readonly locale: EmailLocale;
}

/**
 * Renders a transactional template and hands it to the transport.
 * Shared by domain notifiers so the delivery algorithm lives in one place.
 */
export async function sendRenderedEmail(
  emailSender: EmailSender,
  renderer: EmailTemplateRenderer,
  id: EmailTemplateId,
  recipient: TemplateEmailRecipient,
  vars: EmailTemplateVars,
): Promise<void> {
  const rendered = renderer.render(id, recipient.locale, vars);

  await emailSender.send({
    to: recipient.email,
    subject: rendered.subject,
    html: rendered.html,
  });
}
