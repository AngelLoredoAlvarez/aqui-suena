import { FakeEmailSender } from "@aqui-suena/api/domain/billing/email";
import { describe, expect, it } from "vitest";

describe("FakeEmailSender", () => {
  it("captures sent messages", async () => {
    const sender = new FakeEmailSender();

    await sender.send({
      to: "owner@example.com",
      subject: "Tu pago falló",
      html: "<p>Periodo de gracia de 7 días.</p>",
    });

    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]?.to).toBe("owner@example.com");
    expect(sender.sent[0]?.subject).toBe("Tu pago falló");
  });

  it("starts with an empty sent list", () => {
    const sender = new FakeEmailSender();

    expect(sender.sent).toHaveLength(0);
  });
});
