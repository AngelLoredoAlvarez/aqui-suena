import type { Business } from "@aqui-suena/api/domain/directory/model/business";
import { buildMediaKey } from "@aqui-suena/api/domain/media/key";
import { InMemoryBusinessRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-business-repository";
import { InMemoryMediaRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-media-repository";
import { InMemoryObjectStorage } from "@aqui-suena/api/infrastructure/memory/in-memory-object-storage";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-subscription-repository";
import { createMediaRouter } from "@aqui-suena/api/server/routers/media/media";
import { describe, expect, it } from "vitest";

const UUID = "3c8f0a4e-1f3b-4a2c-9d5e-6b7a8c9d0e1f";

const ownedBusiness: Business = {
  id: "biz-1",
  accountId: "acc-1",
  name: "One",
  category: "food",
  phone: null,
  email: null,
  address: null,
  timezone: "America/Mexico_City",
  delivery: false,
  hiddenAt: null,
  retainedUntil: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("media router", () => {
  function setup(
    options: { businesses?: Business[]; subscriptions?: InMemorySubscriptionRepository } = {},
  ) {
    const repository = new InMemoryMediaRepository([]);

    const storage = new InMemoryObjectStorage();

    const business = new InMemoryBusinessRepository(options.businesses ?? [ownedBusiness]);

    const subscription = options.subscriptions ?? new InMemorySubscriptionRepository([]);

    const router = createMediaRouter({
      media: repository,
      business,
      subscription,
      storage,
    });

    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    return { repository, storage, caller, subscription, router };
  }

  function withoutStorage() {
    const router = createMediaRouter({
      media: new InMemoryMediaRepository([]),
      business: new InMemoryBusinessRepository([]),
      subscription: new InMemorySubscriptionRepository([]),
      storage: undefined,
    });

    return router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
  }

  async function paidPlan(plan: "trades" | "commerce") {
    const subscription = new InMemorySubscriptionRepository([]);

    await subscription.create(
      "acc-1",
      plan,
      new Date("2024-01-01T00:00:00Z"),
      new Date("2999-01-01T00:00:00Z"),
    );

    return subscription;
  }

  it("presigns an account avatar under the v1 account prefix", async () => {
    const { caller, storage } = setup();

    const result = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    expect(result.key).toMatch(/^media\/v1\/acc-1\/account\/avatar\/[0-9a-f-]{36}\.png$/);
    expect(result.uploadUrl).toMatch(/^https:/);
    expect(storage.presigned).toHaveLength(1);
    expect(storage.presigned[0]?.businessId).toBeUndefined();
  });

  it("presigns business media under the v1 business prefix", async () => {
    const { caller, storage } = setup();

    const result = await caller.presignUpload({
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
      businessId: "biz-1",
    });

    expect(result.key).toMatch(/^media\/v1\/acc-1\/businesses\/biz-1\/flyer\/[0-9a-f-]{36}\.jpg$/);
    expect(storage.presigned[0]?.businessId).toBe("biz-1");
  });

  it("rejects business media without a business id on presign", async () => {
    const { caller } = setup();

    await expect(
      caller.presignUpload({ kind: "flyer", contentType: "image/jpeg", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a business id for an avatar on presign", async () => {
    const { caller } = setup();

    await expect(
      caller.presignUpload({
        kind: "avatar",
        contentType: "image/png",
        sizeBytes: 512,
        businessId: "biz-1",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects media for a business owned by another account on presign", async () => {
    const { caller } = setup({
      businesses: [{ ...ownedBusiness, accountId: "acc-2" }],
    });

    await expect(
      caller.presignUpload({
        kind: "flyer",
        contentType: "image/jpeg",
        sizeBytes: 512,
        businessId: "biz-1",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects media for a business that does not exist on presign", async () => {
    const { caller } = setup({ businesses: [] });

    await expect(
      caller.presignUpload({
        kind: "flyer",
        contentType: "image/jpeg",
        sizeBytes: 512,
        businessId: "biz-1",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a product photo on a plan without full media", async () => {
    const { caller } = setup();

    await expect(
      caller.presignUpload({
        kind: "product-photo",
        contentType: "image/jpeg",
        sizeBytes: 512,
        businessId: "biz-1",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("UPGRADE_REQUIRED"),
    });
  });

  it("presigns a product photo on a full-media plan", async () => {
    const { caller } = setup({ subscriptions: await paidPlan("trades") });

    const result = await caller.presignUpload({
      kind: "product-photo",
      contentType: "image/jpeg",
      sizeBytes: 512,
      businessId: "biz-1",
    });

    expect(result.key).toMatch(
      /^media\/v1\/acc-1\/businesses\/biz-1\/product-photo\/[0-9a-f-]{36}\.jpg$/,
    );
  });

  it("rejects spot audio while the spot entitlement is off", async () => {
    const { caller } = setup({ subscriptions: await paidPlan("commerce") });

    await expect(
      caller.presignUpload({
        kind: "spot-audio",
        contentType: "audio/mpeg",
        sizeBytes: 512,
        businessId: "biz-1",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid mime on presign", async () => {
    const { caller } = setup();

    await expect(
      caller.presignUpload({ kind: "avatar", contentType: "image/gif", sizeBytes: 512 }),
    ).rejects.toThrow();
  });

  it("confirm stores metadata after head succeeds", async () => {
    const { caller, storage, repository } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    storage.confirm(key, 512, "image/png");

    const media = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    expect(media.r2Key).toBe(key);
    expect(media.businessId).toBeNull();
    expect(await repository.getById(media.id)).not.toBeNull();
  });

  it("rejects a key that belongs to another account with NOT_FOUND", async () => {
    const { caller, storage } = setup();
    const key = `media/v1/acc-2/account/avatar/${UUID}.png`;
    storage.confirm(key, 512, "image/png");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a key whose kind differs from the declared kind with NOT_FOUND", async () => {
    const { caller, storage } = setup();
    const key = `media/v1/acc-1/businesses/biz-1/product-photo/${UUID}.webp`;
    storage.confirm(key, 512, "image/png");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a key with a prototype-chain kind segment with NOT_FOUND", async () => {
    const { caller } = setup();

    await expect(
      caller.confirm({
        key: `media/v1/acc-1/businesses/biz-1/toString/${UUID}.png`,
        kind: "avatar",
        contentType: "image/png",
        sizeBytes: 512,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a legacy flat key with NOT_FOUND", async () => {
    const { caller, storage } = setup();
    const key = `product-photo/acc-1/${UUID}`;
    storage.confirm(key, 512, "image/webp");

    await expect(
      caller.confirm({ key, kind: "product-photo", contentType: "image/webp", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a key whose extension differs from the declared content type", async () => {
    const { caller, storage } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 512, "image/jpeg");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/jpeg", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a content type that differs from storage with BAD_REQUEST", async () => {
    const { caller, storage } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 512, "image/jpeg");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a size that differs from storage with BAD_REQUEST", async () => {
    const { caller, storage } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 1024, "image/png");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("persists the real storage size instead of the presigned size", async () => {
    const { caller, storage, repository } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 600, "image/png");

    const media = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 600,
    });

    expect(media.size).toBe(600);
    expect(media.mime).toBe("image/png");
    expect((await repository.getById(media.id))?.size).toBe(600);
  });

  it("persists the business scope parsed from the key", async () => {
    const { caller, storage, repository } = setup();
    const { key } = await caller.presignUpload({
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
      businessId: "biz-1",
    });
    storage.confirm(key, 512, "image/jpeg");

    const media = await caller.confirm({
      key,
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
    });

    expect(media.businessId).toBe("biz-1");
    expect((await repository.getById(media.id))?.businessId).toBe("biz-1");
  });

  it("rejects confirming a key under a business owned by another account", async () => {
    const { caller, storage, repository } = setup({
      businesses: [ownedBusiness, { ...ownedBusiness, id: "biz-2", accountId: "acc-2" }],
    });

    const key = buildMediaKey({
      accountId: "acc-1",
      businessId: "biz-2",
      kind: "flyer",
      contentType: "image/jpeg",
      objectId: UUID,
    });

    storage.confirm(key, 512, "image/jpeg");

    await expect(
      caller.confirm({ key, kind: "flyer", contentType: "image/jpeg", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await repository.findByR2Key(key)).toBeNull();
  });

  it("allows an owned hidden business and rejects a foreign hidden one", async () => {
    const { caller } = setup({
      businesses: [
        { ...ownedBusiness, id: "biz-hidden", hiddenAt: new Date() },
        { ...ownedBusiness, id: "biz-foreign", accountId: "acc-2", hiddenAt: new Date() },
      ],
    });

    await expect(
      caller.presignUpload({
        kind: "flyer",
        contentType: "image/jpeg",
        sizeBytes: 512,
        businessId: "biz-hidden",
      }),
    ).resolves.toBeTruthy();

    await expect(
      caller.presignUpload({
        kind: "flyer",
        contentType: "image/jpeg",
        sizeBytes: 512,
        businessId: "biz-foreign",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects malformed business ids at the boundary", async () => {
    const { caller } = setup();

    for (const businessId of ["../acc-2", "a/b", "..", "."]) {
      await expect(
        caller.presignUpload({
          kind: "flyer",
          contentType: "image/jpeg",
          sizeBytes: 512,
          businessId,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("revalidates the plan entitlement on confirm", async () => {
    const subscription = await paidPlan("trades");

    const { caller, storage } = setup({ subscriptions: subscription });

    const { key } = await caller.presignUpload({
      kind: "product-photo",
      contentType: "image/jpeg",
      sizeBytes: 512,
      businessId: "biz-1",
    });

    storage.confirm(key, 512, "image/jpeg");

    const active = await subscription.getActive("acc-1");

    if (active !== null) {
      await subscription.updateStatus(active.id, "expired");
    }

    await expect(
      caller.confirm({ key, kind: "product-photo", contentType: "image/jpeg", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("still returns an already confirmed row after a downgrade", async () => {
    const subscription = await paidPlan("trades");

    const { caller, storage } = setup({ subscriptions: subscription });

    const { key } = await caller.presignUpload({
      kind: "product-photo",
      contentType: "image/jpeg",
      sizeBytes: 512,
      businessId: "biz-1",
    });

    storage.confirm(key, 512, "image/jpeg");

    const first = await caller.confirm({
      key,
      kind: "product-photo",
      contentType: "image/jpeg",
      sizeBytes: 512,
    });

    const active = await subscription.getActive("acc-1");

    if (active !== null) {
      await subscription.updateStatus(active.id, "expired");
    }

    const second = await caller.confirm({
      key,
      kind: "product-photo",
      contentType: "image/jpeg",
      sizeBytes: 512,
    });

    expect(second.id).toBe(first.id);
  });

  it("returns the existing row when the same object is confirmed twice", async () => {
    const { caller, storage, repository } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 512, "image/png");

    const first = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    const second = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    expect(second.id).toBe(first.id);
    expect(
      (await repository.listByOwner({ ownerId: "acc-1", limit: 20, offset: 0 })).items,
    ).toHaveLength(1);
  });

  it("rejects a real content type outside the kind limits with BAD_REQUEST", async () => {
    const { caller, storage } = setup();
    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });
    storage.confirm(key, 512, "application/pdf");

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "application/pdf", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects bytes that do not match the declared image type", async () => {
    const { caller, storage, repository } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    storage.confirm(key, 512, "image/png", new Date(), new TextEncoder().encode("<html>"));

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const rows = await repository.listByOwner({ ownerId: "acc-1", limit: 20, offset: 0 });

    expect(rows.items).toHaveLength(0);
  });

  it("rejects a JPEG that carries GPS EXIF", async () => {
    const { caller, storage } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/jpeg",
      sizeBytes: 512,
    });

    const tiff = new Uint8Array([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x25, 0x88, 0x04, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0x4e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);

    const data = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];

    const length = data.length + 2;

    storage.confirm(
      key,
      512,
      "image/jpeg",
      new Date(),
      new Uint8Array([
        0xff,
        0xd8,
        0xff,
        0xe1,
        (length >> 8) & 0xff,
        length & 0xff,
        ...data,
        0xff,
        0xd9,
      ]),
    );

    await expect(
      caller.confirm({ key, kind: "avatar", contentType: "image/jpeg", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("confirm throws NOT_FOUND when the object is missing in storage", async () => {
    const { caller } = setup();

    await expect(
      caller.confirm({
        key: `media/v1/acc-1/account/avatar/${UUID}.png`,
        kind: "avatar",
        contentType: "image/png",
        sizeBytes: 512,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("list returns owner media", async () => {
    const { caller, storage } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    storage.confirm(key, 512, "image/png");

    await caller.confirm({ key, kind: "avatar", contentType: "image/png", sizeBytes: 512 });

    const page = await caller.list();

    expect(page.items).toHaveLength(1);
    expect(page).toMatchObject({ limit: 20, offset: 0, nextOffset: null });
  });

  it("pages the owner's media and rejects out-of-range values", async () => {
    const { caller, repository } = setup();

    await repository.create({
      ownerId: "acc-1",
      businessId: null,
      kind: "avatar",
      r2Key: "k1",
      mime: "image/png",
      size: 1,
    });
    await repository.create({
      ownerId: "acc-1",
      businessId: null,
      kind: "avatar",
      r2Key: "k2",
      mime: "image/png",
      size: 1,
    });
    await repository.create({
      ownerId: "acc-2",
      businessId: null,
      kind: "avatar",
      r2Key: "k3",
      mime: "image/png",
      size: 1,
    });

    const page = await caller.list({ limit: 1 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.ownerId).toBe("acc-1");
    expect(page.nextOffset).toBe(1);

    await expect(caller.list({ limit: 101 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.list({ offset: -1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("delete removes from repo and storage", async () => {
    const { caller, storage } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    storage.confirm(key, 512, "image/png");

    const media = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    const ok = await caller.delete({ id: media.id });

    expect(ok).toBe(true);
    expect(await storage.head(key)).toBeNull();
  });

  it("rejects deleting a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.delete({ id: 123 as never })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects deleting a missing media with NOT_FOUND", async () => {
    const { caller } = setup();

    await expect(caller.delete({ id: "nonexistent" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns a signed read url for the owner's media", async () => {
    const { caller, storage } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    storage.confirm(key, 512, "image/png");

    const media = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    const signed = await caller.signedUrl({ id: media.id });

    expect(signed.url).toBe(`https://fake.r2/${key}?signed=1`);
  });

  it("returns a signed read url for the owner's business media", async () => {
    const { caller, storage } = setup();

    const { key } = await caller.presignUpload({
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
      businessId: "biz-1",
    });

    storage.confirm(key, 512, "image/jpeg");

    const media = await caller.confirm({
      key,
      kind: "flyer",
      contentType: "image/jpeg",
      sizeBytes: 512,
    });

    expect((await caller.signedUrl({ id: media.id })).url).toContain(key);
  });

  it("returns a signed read url for a legacy flat key", async () => {
    const { caller, repository } = setup();

    const media = await repository.create({
      ownerId: "acc-1",
      businessId: null,
      kind: "product-photo",
      r2Key: `product-photo/acc-1/${UUID}`,
      mime: "image/jpeg",
      size: 512,
    });

    expect((await caller.signedUrl({ id: media.id })).url).toContain(media.r2Key);
  });

  it("rejects signing media owned by another account with NOT_FOUND", async () => {
    const { caller, router, storage } = setup();

    const { key } = await caller.presignUpload({
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    storage.confirm(key, 512, "image/png");

    const media = await caller.confirm({
      key,
      kind: "avatar",
      contentType: "image/png",
      sizeBytes: 512,
    });

    const foreign = router.createCaller({ user: { id: "u2", accountId: "acc-2" } });

    await expect(foreign.signedUrl({ id: media.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Media not found",
    });
  });

  it("rejects signing a missing media with NOT_FOUND", async () => {
    const { caller } = setup();

    await expect(caller.signedUrl({ id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Media not found",
    });
  });

  it("rejects signing a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.signedUrl({ id: 123 as never })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("answers SERVICE_UNAVAILABLE on presign when storage is not configured", async () => {
    const caller = withoutStorage();

    await expect(
      caller.presignUpload({ kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "media storage is not configured",
    });
  });

  it("answers SERVICE_UNAVAILABLE on confirm when storage is not configured", async () => {
    const caller = withoutStorage();

    await expect(
      caller.confirm({
        key: "avatar/acc-1/1",
        kind: "avatar",
        contentType: "image/png",
        sizeBytes: 512,
      }),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  it("answers SERVICE_UNAVAILABLE on delete when storage is not configured", async () => {
    const caller = withoutStorage();

    await expect(caller.delete({ id: "media-1" })).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("answers SERVICE_UNAVAILABLE on signedUrl when storage is not configured", async () => {
    const caller = withoutStorage();

    await expect(caller.signedUrl({ id: "media-1" })).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });
});
