import { presignR2ObjectUrl } from "@aqui-suena/api/infrastructure/r2/sigv4";
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
