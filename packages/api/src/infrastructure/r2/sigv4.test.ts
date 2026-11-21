import { presignR2ListUrl, presignR2ObjectUrl } from "@aqui-suena/api/infrastructure/r2/sigv4";
import { describe, expect, it } from "vitest";

const options = {
  accountId: "acct123",
  accessKeyId: "AKID",
  secretAccessKey: "SECRET",
  bucketName: "my-bucket",
};

describe("presignR2ObjectUrl", () => {
  it("signs the key with the expected SigV4 parameters", async () => {
    const url = await presignR2ObjectUrl(options, "PUT", "avatar/acc-1/1");

    expect(url).toContain("https://acct123.r2.cloudflarestorage.com/my-bucket/avatar/acc-1/1");
    expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(url).toContain("X-Amz-Expires=300");
    expect(url).toContain("X-Amz-SignedHeaders=host");
    expect(url).toMatch(/X-Amz-Signature=[0-9a-f]{64}$/);
  });

  it("signs the method, so GET and DELETE do not share a signature", async () => {
    const [get, remove] = await Promise.all([
      presignR2ObjectUrl(options, "GET", "same-key"),
      presignR2ObjectUrl(options, "DELETE", "same-key"),
    ]);

    expect(get).not.toBe(remove);
  });

  it("honors a custom endpoint", async () => {
    const url = await presignR2ObjectUrl(
      { ...options, endpoint: "http://localhost:9000" },
      "GET",
      "k",
    );

    expect(url.startsWith("http://localhost:9000/my-bucket/k?")).toBe(true);
  });
});

describe("presignR2ObjectUrl overrides", () => {
  it("defaults to five minutes and honours a requested expiry", async () => {
    const short = await presignR2ObjectUrl(options, "GET", "cfdi/a/b.pdf");
    const long = await presignR2ObjectUrl(options, "GET", "cfdi/a/b.pdf", {
      expiresInSeconds: 900,
    });

    expect(short).toContain("X-Amz-Expires=300");
    expect(long).toContain("X-Amz-Expires=900");
  });

  it("caps the expiry at seven days", async () => {
    const url = await presignR2ObjectUrl(options, "GET", "cfdi/a/b.pdf", {
      expiresInSeconds: 999_999,
    });

    expect(url).toContain("X-Amz-Expires=604800");
  });

  it("signs the response overrides so R2 serves a named download", async () => {
    const url = await presignR2ObjectUrl(options, "GET", "cfdi/a/b.pdf", {
      responseContentDisposition: 'attachment; filename="CFDI-uuid.pdf"',
      responseContentType: "application/pdf",
    });

    const parsed = new URL(url);

    expect(parsed.searchParams.get("response-content-disposition")).toBe(
      'attachment; filename="CFDI-uuid.pdf"',
    );
    expect(parsed.searchParams.get("response-content-type")).toBe("application/pdf");
    expect(parsed.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("presignR2ListUrl", () => {
  it("signs a bucket list request with the prefix and continuation token", async () => {
    const first = new URL(await presignR2ListUrl(options, "media/v1/acc-1/"));
    const second = new URL(await presignR2ListUrl(options, "media/v1/acc-1/", "next-token"));

    expect(first.pathname).toBe("/my-bucket");
    expect(first.searchParams.get("list-type")).toBe("2");
    expect(first.searchParams.get("prefix")).toBe("media/v1/acc-1/");
    expect(first.searchParams.get("continuation-token")).toBeNull();
    expect(first.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(second.searchParams.get("continuation-token")).toBe("next-token");
    expect(second.searchParams.get("X-Amz-Signature")).not.toBe(
      first.searchParams.get("X-Amz-Signature"),
    );
  });
});
