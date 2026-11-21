import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { InMemoryObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { probeMediaStorage } from "@aqui-suena/api/server/http/health";
import { describe, expect, it, vi } from "vitest";

const failingStorage: ObjectStorage = {
  presignUpload: async () => ({ key: "k", uploadUrl: "https://example.test/k" }),
  signedUrl: async () => "https://example.test/signed",
  head: async () => {
    throw new Error("R2 head failed: 403");
  },
  readObject: async () => null,
  list: async () => [],
  delete: async () => undefined,
};

describe("probeMediaStorage", () => {
  it("reports unconfigured when there is no storage", async () => {
    expect(await probeMediaStorage(undefined)).toBe("unconfigured");
  });

  it("reports configured when the bucket answers the read", async () => {
    expect(await probeMediaStorage(new InMemoryObjectStorage())).toBe("configured");
  });

  it("reports unreachable when the read fails and logs the cause", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await probeMediaStorage(failingStorage)).toBe("unreachable");
    expect(errorLog).toHaveBeenCalledWith("health: media probe failed", {
      error: "R2 head failed: 403",
    });

    errorLog.mockRestore();
  });
});
