import { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-object-storage";
import { presignR2ObjectUrl } from "@aqui-suena/api/infrastructure/r2/sigv4";
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

  it("signs a GET url for a stored key", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 200 });

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });
    const key = "media/v1/acc-1/account/avatar/key.png";

    const url = await storage.signedUrl(key);
    const put = await presignR2ObjectUrl(baseOptions, "PUT", key);

    expect(url).toContain(`/my-bucket/${key}`);
    expect(url).toContain("X-Amz-Signature=");
    expect(url).toContain("X-Amz-Expires=300");
    expect(url).not.toBe(put);
  });

  it("reads the stored object bytes with their metadata", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        status: 200,
        headers: { "content-length": "4", "content-type": "image/png" },
      });

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    expect(await storage.readObject("media/v1/acc-1/account/avatar/key.png")).toEqual({
      key: "media/v1/acc-1/account/avatar/key.png",
      size: 4,
      contentType: "image/png",
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    });
  });

  it("returns null when reading a missing object and throws on other errors", async () => {
    const missing = new R2ObjectStorage({
      ...baseOptions,
      fetchFn: (async () => new Response(null, { status: 404 })) as typeof fetch,
    });

    const failing = new R2ObjectStorage({
      ...baseOptions,
      fetchFn: (async () => new Response(null, { status: 500 })) as typeof fetch,
    });

    await expect(missing.readObject("missing")).resolves.toBeNull();
    await expect(failing.readObject("k")).rejects.toThrow("R2 read failed: 500");
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

  it("tolerates a 404 when deleting an already missing object", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 404 });
    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    await expect(storage.delete("missing")).resolves.toBeUndefined();
  });

  it("lists objects under a prefix and follows continuation tokens", async () => {
    const urls: string[] = [];

    const pages = [
      `<?xml version="1.0" encoding="UTF-8"?>
      <ListBucketResult>
        <IsTruncated>true</IsTruncated>
        <Contents>
          <Key>media/v1/acc-1/account/avatar/one.png</Key>
          <LastModified>2026-01-01T00:00:00.000Z</LastModified>
        </Contents>
        <NextContinuationToken>next</NextContinuationToken>
      </ListBucketResult>`,
      `<?xml version="1.0" encoding="UTF-8"?>
      <ListBucketResult>
        <IsTruncated>false</IsTruncated>
        <Contents>
          <Key>media/v1/acc-1/account/avatar/two.png</Key>
          <LastModified>2026-01-02T00:00:00.000Z</LastModified>
        </Contents>
      </ListBucketResult>`,
    ];

    const fakeFetch: typeof fetch = async (url) => {
      urls.push(String(url));
      return new Response(pages.shift(), { status: 200 });
    };

    const storage = new R2ObjectStorage({ ...baseOptions, fetchFn: fakeFetch });

    const objects = await storage.list("media/v1/acc-1/");

    expect(objects).toEqual([
      {
        key: "media/v1/acc-1/account/avatar/one.png",
        lastModified: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        key: "media/v1/acc-1/account/avatar/two.png",
        lastModified: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    expect(urls[0]).toContain("list-type=2");
    expect(urls[0]).toContain("prefix=media%2Fv1%2Facc-1%2F");
    expect(urls[1]).toContain("continuation-token=next");
  });
});
