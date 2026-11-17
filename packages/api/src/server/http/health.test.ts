import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { InMemoryObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { probeMediaStorage } from "@aqui-suena/api/server/http/health";
import { describe, expect, it } from "vitest";

const failingStorage: ObjectStorage = {
  presignUpload: async () => ({ key: "k", uploadUrl: "https://example.test/k" }),
  head: async () => {
    throw new Error("R2 head failed: 403");
  },
  delete: async () => undefined,
};

describe("probeMediaStorage", () => {
  it("reports unconfigured when there is no storage", async () => {
    expect(await probeMediaStorage(undefined)).toBe("unconfigured");
  });

  it("reports configured when the bucket answers the read", async () => {
    expect(await probeMediaStorage(new InMemoryObjectStorage())).toBe("configured");
  });

  it("reports unreachable when the read fails", async () => {
    expect(await probeMediaStorage(failingStorage)).toBe("unreachable");
  });
});
