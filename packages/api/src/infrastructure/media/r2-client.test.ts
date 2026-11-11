import { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-client";
import { describe, expect, it } from "vitest";

describe("R2ObjectStorage", () => {
  const baseOptions = {
    accountId: "acct123",
    accessKeyId: "AKID",
    secretAccessKey: "SECRET",
    bucketName: "my-bucket",
  };

  it("presigns a PUT url with SigV4 params", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 200 });

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    const result = await storage.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
      ownerId: "acc-1",
    });

    expect(result.key).toMatch(/^avatar\/acc-1\//);
    expect(result.uploadUrl).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(result.uploadUrl).toContain("X-Amz-Expires=300");
    expect(result.uploadUrl).toContain("X-Amz-Signature=");
  });

  it("rejects an invalid upload before signing", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 200 });

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    await expect(
      storage.presignUpload({
        kind: "avatar",
        contentType: "image/gif",
        sizeBytes: 512,
        ownerId: "acc-1",
      }),
    ).rejects.toThrow();
  });

  it("head returns metadata on 200", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(null, {
        status: 200,
        headers: { "content-length": "512", "content-type": "image/png" },
      });

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    const meta = await storage.head("avatar/acc-1/1");

    expect(meta).toEqual({ key: "avatar/acc-1/1", size: 512, contentType: "image/png" });
  });

  it("head returns null on 404", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 404 });

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    expect(await storage.head("missing")).toBeNull();
  });

  it("delete calls DELETE", async () => {
    let method = "";

    const fakeFetch: typeof fetch = async (_url, init) => {
      method = init?.method ?? "";
      return new Response(null, { status: 204 });
    };

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    await storage.delete("avatar/acc-1/1");

    expect(method).toBe("DELETE");
  });
});
