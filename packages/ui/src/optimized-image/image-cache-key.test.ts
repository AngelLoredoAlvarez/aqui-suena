import { imageCacheKey } from "@aqui-suena/ui/optimized-image/image-cache-key";
import { describe, expect, it } from "vitest";

const SIGNED_FIRST =
  "https://media.example.com/media/v1/acc-1/businesses/biz-1/flyer/11111111-1111-1111-1111-111111111111.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20261124T110000Z&X-Amz-Expires=300&X-Amz-Signature=aaa";
const SIGNED_SECOND =
  "https://media.example.com/media/v1/acc-1/businesses/biz-1/flyer/11111111-1111-1111-1111-111111111111.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20261124T120000Z&X-Amz-Expires=300&X-Amz-Signature=bbb";

describe("imageCacheKey", () => {
  it("drops the rotating signature parameters", () => {
    expect(imageCacheKey(SIGNED_FIRST)).toBe(
      "https://media.example.com/media/v1/acc-1/businesses/biz-1/flyer/11111111-1111-1111-1111-111111111111.jpg",
    );
  });

  it("returns the same key for two signatures of the same object", () => {
    expect(imageCacheKey(SIGNED_FIRST)).toBe(imageCacheKey(SIGNED_SECOND));
  });

  it("keeps different media objects apart", () => {
    const other = SIGNED_FIRST.replace("11111111-1111", "22222222-2222");

    expect(imageCacheKey(SIGNED_FIRST)).not.toBe(imageCacheKey(other));
  });

  it("falls back to the raw string when the url is not absolute", () => {
    expect(imageCacheKey("/media/flyer.jpg?signature=abc")).toBe("/media/flyer.jpg?signature=abc");
  });
});
