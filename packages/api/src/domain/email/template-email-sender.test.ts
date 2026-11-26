import type { EmailMessage, EmailSender } from "@aqui-suena/api/domain/email/email";
import type {
  EmailLocale,
  EmailTemplateId,
  EmailTemplateRenderer,
  EmailTemplateVars,
} from "@aqui-suena/api/domain/email/email-template";
import { sendRenderedEmail } from "@aqui-suena/api/domain/email/template-email-sender";
import { describe, expect, it, vi } from "vitest";

function recordingRenderer(
  rendered: { subject: string; html: string } = { subject: "Subj", html: "<p>Hi</p>" },
) {
  const render = vi.fn<
    (
      id: EmailTemplateId,
      locale: EmailLocale,
      vars: EmailTemplateVars,
    ) => {
      subject: string;
      html: string;
    }
  >(() => rendered);

  return { renderer: { render } satisfies EmailTemplateRenderer, render };
}

describe("sendRenderedEmail", () => {
  it("renders the template and sends subject and html to the recipient", async () => {
    const { renderer, render } = recordingRenderer({ subject: "Welcome", html: "<p>Hi</p>" });
    const send = vi.fn<EmailSender["send"]>(async () => {});
    const vars: EmailTemplateVars = { name: "Ana" };

    await sendRenderedEmail(
      { send },
      renderer,
      "welcome",
      { email: "ana@example.com", locale: "es-MX" },
      vars,
    );

    expect(render).toHaveBeenCalledWith("welcome", "es-MX", vars);
    expect(send).toHaveBeenCalledWith({
      to: "ana@example.com",
      subject: "Welcome",
      html: "<p>Hi</p>",
    });
  });

  it("attaches files when present", async () => {
    const { renderer } = recordingRenderer();
    const send = vi.fn<EmailSender["send"]>(async () => {});
    const attachment = { filename: "x.pdf", content: "cA==", contentType: "application/pdf" };

    await sendRenderedEmail(
      { send },
      renderer,
      "invoice-cfdi",
      { email: "ana@example.com", locale: "es-MX" },
      {},
      [attachment],
    );

    const message = send.mock.calls[0]?.[0] as EmailMessage;

    expect(message.attachments).toEqual([attachment]);
  });

  it("omits the attachments key when there are no files", async () => {
    const { renderer } = recordingRenderer();
    const send = vi.fn<EmailSender["send"]>(async () => {});

    await sendRenderedEmail(
      { send },
      renderer,
      "welcome",
      { email: "ana@example.com", locale: "es-MX" },
      {},
    );

    const message = send.mock.calls[0]?.[0] as EmailMessage;

    expect(message).not.toHaveProperty("attachments");
  });
});
