import { createApp } from "@aqui-suena/api/server/http/app";
import { describe, expect, it } from "vitest";

describe("POST /webhooks/conekta", () => {
  it("answers 503 when the webhook is not configured", async () => {
    const app = createApp({ allowedOrigins: [], logRequests: false });

    const response = await app.request("https://api.test/webhooks/conekta", {
      method: "POST",
    });

    expect(response.status).toBe(503);
  });

  it("delegates to the configured handler", async () => {
    const app = createApp({
      allowedOrigins: [],
      logRequests: false,
      conektaWebhook: async (context) => context.text("ok"),
    });

    const response = await app.request("https://api.test/webhooks/conekta", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });
});
