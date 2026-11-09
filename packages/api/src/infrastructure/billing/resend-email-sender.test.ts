import { describe, expect, it } from "vitest";
import { ResendEmailSender } from "./resend-email-sender";

type CapturedCall = { url: string; init: RequestInit };

describe("ResendEmailSender", () => {
  it("POSTs to the Resend API with the correct payload", async () => {
    const calls: CapturedCall[] = [];

    const fakeFetch: typeof fetch = async (url, init) => {
      if (init === undefined) {
        throw new Error("init is required");
      }

      calls.push({ url: String(url), init });

      return new Response(JSON.stringify({ id: "email-123" }), { status: 200 });
    };

    const sender = new ResendEmailSender({
      apiKey: "re_test_key",
      from: "noreply@aqui-suena.com",
      fetchFn: fakeFetch,
    });

    await sender.send({
      to: "owner@example.com",
      subject: "Tu pago falló",
      html: "<p>Periodo de gracia de 7 días.</p>",
    });

    expect(calls).toHaveLength(1);

    const call = calls[0];

    if (call === undefined) {
      throw new Error("expected at least one call");
    }

    expect(call.url).toBe("https://api.resend.com/emails");

    const body: unknown = JSON.parse(String(call.init.body));

    expect(body).toEqual({
      from: "noreply@aqui-suena.com",
      to: "owner@example.com",
      subject: "Tu pago falló",
      html: "<p>Periodo de gracia de 7 días.</p>",
    });

    const headers = call.init.headers;

    if (headers === undefined || typeof headers !== "object") {
      throw new Error("expected headers object");
    }

    const authHeader = (headers as Record<string, string>).Authorization;

    expect(authHeader).toBe("Bearer re_test_key");
  });

  it("throws when the API returns a non-2xx status", async () => {
    const fakeFetch: typeof fetch = async () => new Response("invalid api key", { status: 401 });

    const sender = new ResendEmailSender({
      apiKey: "bad_key",
      from: "noreply@aqui-suena.com",
      fetchFn: fakeFetch,
    });

    await expect(
      sender.send({
        to: "owner@example.com",
        subject: "test",
        html: "<p>test</p>",
      }),
    ).rejects.toThrow(/Resend API error 401/);
  });
});
