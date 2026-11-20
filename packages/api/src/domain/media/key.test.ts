import { buildMediaKey, parseMediaKey, resolveMediaScope } from "@aqui-suena/api/domain/media/key";
import { MediaValidationError } from "@aqui-suena/api/domain/media/media-kind";
import { describe, expect, it } from "vitest";

const UUID = "3c8f0a4e-1f3b-4a2c-9d5e-6b7a8c9d0e1f";

describe("buildMediaKey", () => {
  it("builds a business key for every scoped kind and content type", () => {
    expect(
      buildMediaKey({
        accountId: "acc_123",
        businessId: "biz_456",
        kind: "product-photo",
        contentType: "image/webp",
        objectId: UUID,
      }),
    ).toBe(`media/v1/acc_123/businesses/biz_456/product-photo/${UUID}.webp`);
    expect(
      buildMediaKey({
        accountId: "acc_123",
        businessId: "biz_456",
        kind: "flyer",
        contentType: "image/jpeg",
        objectId: UUID,
      }),
    ).toBe(`media/v1/acc_123/businesses/biz_456/flyer/${UUID}.jpg`);
    expect(
      buildMediaKey({
        accountId: "acc_123",
        businessId: "biz_456",
        kind: "spot-audio",
        contentType: "audio/mpeg",
        objectId: UUID,
      }),
    ).toBe(`media/v1/acc_123/businesses/biz_456/spot-audio/${UUID}.mp3`);
  });

  it("builds an account key for an avatar", () => {
    expect(
      buildMediaKey({
        accountId: "acc_123",
        kind: "avatar",
        contentType: "image/png",
        objectId: UUID,
      }),
    ).toBe(`media/v1/acc_123/account/avatar/${UUID}.png`);
  });

  it("generates a unique object id when none is provided", () => {
    const first = buildMediaKey({
      accountId: "acc_123",
      kind: "avatar",
      contentType: "image/png",
    });

    const second = buildMediaKey({
      accountId: "acc_123",
      kind: "avatar",
      contentType: "image/png",
    });

    expect(first).not.toBe(second);
    expect(first).toMatch(/^media\/v1\/acc_123\/account\/avatar\/[0-9a-f-]{36}\.png$/);
  });

  it("rejects a business id for account media", () => {
    expect(() =>
      buildMediaKey({
        accountId: "acc_123",
        businessId: "biz_456",
        kind: "avatar",
        contentType: "image/png",
      }),
    ).toThrow(MediaValidationError);
  });

  it("requires a business id for business media", () => {
    expect(() =>
      buildMediaKey({ accountId: "acc_123", kind: "flyer", contentType: "image/jpeg" }),
    ).toThrow(MediaValidationError);
    expect(() =>
      buildMediaKey({
        accountId: "acc_123",
        businessId: "",
        kind: "flyer",
        contentType: "image/jpeg",
      }),
    ).toThrow(MediaValidationError);
  });

  it("rejects a content type the kind does not allow", () => {
    expect(() =>
      buildMediaKey({
        accountId: "acc_123",
        kind: "avatar",
        contentType: "audio/mpeg",
        objectId: UUID,
      }),
    ).toThrow(MediaValidationError);
    expect(() =>
      buildMediaKey({
        accountId: "acc_123",
        businessId: "biz_456",
        kind: "flyer",
        contentType: "image/gif",
        objectId: UUID,
      }),
    ).toThrow(MediaValidationError);
  });
});

describe("resolveMediaScope", () => {
  it("maps avatars to the account and the other kinds to a business", () => {
    expect(resolveMediaScope("avatar", undefined)).toEqual({ type: "account" });
    expect(resolveMediaScope("flyer", "biz_456")).toEqual({
      type: "business",
      businessId: "biz_456",
    });
  });
});

describe("parseMediaKey", () => {
  it("round-trips a business key", () => {
    const key = buildMediaKey({
      accountId: "acc_123",
      businessId: "biz_456",
      kind: "product-photo",
      contentType: "image/webp",
      objectId: UUID,
    });

    expect(parseMediaKey(key)).toEqual({
      accountId: "acc_123",
      scope: { type: "business", businessId: "biz_456" },
      kind: "product-photo",
      objectId: UUID,
      extension: "webp",
    });
  });

  it("round-trips an account key", () => {
    const key = buildMediaKey({
      accountId: "acc_123",
      kind: "avatar",
      contentType: "image/png",
      objectId: UUID,
    });

    expect(parseMediaKey(key)).toEqual({
      accountId: "acc_123",
      scope: { type: "account" },
      kind: "avatar",
      objectId: UUID,
      extension: "png",
    });
  });

  it("rejects a legacy flat key", () => {
    expect(parseMediaKey(`product-photo/acc_123/${UUID}`)).toBeNull();
  });

  it("rejects an unknown layout version or prefix", () => {
    expect(parseMediaKey(`media/v2/acc_123/account/avatar/${UUID}.png`)).toBeNull();
    expect(parseMediaKey(`files/v1/acc_123/account/avatar/${UUID}.png`)).toBeNull();
  });

  it("rejects a malformed object id or extension", () => {
    expect(parseMediaKey("media/v1/acc_123/account/avatar/not-a-uuid.png")).toBeNull();
    expect(parseMediaKey(`media/v1/acc_123/account/avatar/${UUID}.gif`)).toBeNull();
    expect(parseMediaKey(`media/v1/acc_123/account/avatar/${UUID}`)).toBeNull();
    expect(parseMediaKey(`media/v1/acc_123/account/avatar/${UUID}.PNG`)).toBeNull();
  });

  it("rejects Object.prototype kind names instead of throwing", () => {
    for (const kind of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
      const key = `media/v1/acc_123/businesses/biz_456/${kind}/${UUID}.png`;

      expect(() => parseMediaKey(key)).not.toThrow();
      expect(parseMediaKey(key)).toBeNull();
    }
  });

  it("rejects a scope the kind does not allow", () => {
    expect(parseMediaKey(`media/v1/acc_123/businesses/biz_456/avatar/${UUID}.png`)).toBeNull();
    expect(parseMediaKey(`media/v1/acc_123/account/flyer/${UUID}.jpg`)).toBeNull();
  });

  it("rejects missing or extra path segments", () => {
    expect(parseMediaKey(`media/v1/acc_123/account/avatar/${UUID}.png/extra`)).toBeNull();
    expect(parseMediaKey("media/v1/acc_123/account/avatar")).toBeNull();
    expect(parseMediaKey(`media/v1//account/avatar/${UUID}.png`)).toBeNull();
  });
});
