import { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-object-storage";
import { describe, expect, it } from "vitest";

describe("R2ObjectStorage", () => {
  const baseOptions = {
    accountId: "acct123",
    accessKeyId: "AKID",
    secretAccessKey: "SECRET",
    bucketName: "my-bucket",
  };

  it("calls fetch without a receiver, as the Workers runtime requires", async () => {
    const receivers: unknown[] = [];
    const detachedFetch = function (this: unknown) {
      receivers.push(this);
      if (this !== undefined) throw new TypeError("Illegal invocation");

      return Promise.resolve(new Response(null, { status: 200 }));
    } as unknown as typeof fetch;

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: detachedFetch });

    await expect(storage.head("present")).resolves.toMatchObject({ key: "present" });
    await expect(storage.delete("present")).resolves.toBeUndefined();
    expect(receivers).toEqual([undefined, undefined]);
  });

  it("presigns a PUT url for an account key with SigV4 params", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 200 });

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    const result = await storage.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
      ownerId: "acc-1",
    });

    expect(result.key).toMatch(/^media\/v1\/acc-1\/account\/avatar\/[0-9a-f-]{36}\.png$/);
    expect(result.uploadUrl).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(result.uploadUrl).toContain("X-Amz-Expires=300");
    expect(result.uploadUrl).toContain("X-Amz-Signature=");
  });

  it("presigns a PUT url for a business key", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 200 });

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    const result = await storage.presignUpload({
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
      ownerId: "acc-1",
      businessId: "biz-1",
    });

    expect(result.key).toMatch(/^media\/v1\/acc-1\/businesses\/biz-1\/flyer\/[0-9a-f-]{36}\.jpg$/);
  });

  it("rejects a business kind without a business id before signing", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 200 });

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    await expect(
      storage.presignUpload({
        kind: "flyer",
        contentType: "image/jpeg",
        sizeBytes: 512,
        ownerId: "acc-1",
      }),
    ).rejects.toThrow(/requires a businessId/);
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
