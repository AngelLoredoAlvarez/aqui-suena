import { createApp } from "@aqui-suena/api/server/http/app";
import { describe, expect, it, vi } from "vitest";

describe("createApp error handling", () => {
  it("answers a thrown handler with 500 without a second raw console log", async () => {
    const app = createApp({ allowedOrigins: [], logRequests: false });

    app.get("/boom", () => {
      throw new Error("kaboom");
    });

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await app.request("https://api.test/boom");

    expect(response.status).toBe(500);

    // Hono's default handler prints the raw stack. The registered handler must
    // replace it so the request logger stays the only logger.
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
