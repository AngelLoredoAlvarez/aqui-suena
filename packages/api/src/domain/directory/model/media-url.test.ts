import {
  buildPublicImageUrl,
  resolvePublicImageUrl,
} from "@aqui-suena/api/domain/directory/model/media-url";
import { InMemoryMediaRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-media-repository";
import { InMemoryObjectStorage } from "@aqui-suena/api/infrastructure/memory/in-memory-object-storage";
import { describe, expect, it } from "vitest";

const KEY = "media/v1/acc-1/businesses/b-1/flyer/11111111-1111-1111-1111-111111111111.jpg";

function makeRepo() {
  return new InMemoryMediaRepository([
    {
      id: "med-1",
      ownerId: "acc-1",
      businessId: "b-1",
      kind: "flyer",
      r2Key: KEY,
      mime: "image/jpeg",
      size: 4,
      createdAt: new Date(),
    },
  ]);
}

describe("buildPublicImageUrl", () => {
  it("joins the origin and the immutable object key", () => {
    expect(buildPublicImageUrl("https://api.test", KEY)).toBe(`https://api.test/images/${KEY}`);
  });

  it("does not double the slash when the origin ends with one", () => {
    expect(buildPublicImageUrl("https://api.test/", KEY)).toBe(`https://api.test/images/${KEY}`);
  });
});

describe("resolvePublicImageUrl", () => {
  it("returns the public URL for a media row", async () => {
    expect(
      await resolvePublicImageUrl(makeRepo(), new InMemoryObjectStorage(), "https://api.test", {
        mediaId: "med-1",
        url: null,
      }),
    ).toBe(`https://api.test/images/${KEY}`);
  });

  it("keeps a legacy external url untouched", async () => {
    expect(
      await resolvePublicImageUrl(makeRepo(), new InMemoryObjectStorage(), "https://api.test", {
        mediaId: null,
        url: "https://legacy.example/flyer.png",
      }),
    ).toBe("https://legacy.example/flyer.png");
  });

  it("returns null when storage is not configured", async () => {
    expect(
      await resolvePublicImageUrl(makeRepo(), undefined, "https://api.test", {
        mediaId: "med-1",
        url: null,
      }),
    ).toBeNull();
  });

  it("returns null when the media row is missing", async () => {
    expect(
      await resolvePublicImageUrl(makeRepo(), new InMemoryObjectStorage(), "https://api.test", {
        mediaId: "missing",
        url: null,
      }),
    ).toBeNull();
  });
});
