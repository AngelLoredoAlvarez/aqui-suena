import { InMemoryMediaRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-media-repository";
import { describe, expect, it } from "vitest";

describe("InMemoryMediaRepository", () => {
  it("creates a media record with generated id and createdAt", async () => {
    const repo = new InMemoryMediaRepository([]);

    const created = await repo.create({
      ownerId: "acc-1",
      businessId: null,
      kind: "avatar",
      r2Key: "avatar/acc-1/1",
      mime: "image/png",
      size: 512,
    });

    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.r2Key).toBe("avatar/acc-1/1");
    expect(created.businessId).toBeNull();
  });

  it("lists only the owner's media ordered by createdAt, id", async () => {
    const repo = new InMemoryMediaRepository([
      {
        id: "m-2",
        ownerId: "acc-1",
        businessId: null,
        kind: "avatar",
        r2Key: "k2",
        mime: "image/png",
        size: 1,
        createdAt: new Date("2024-01-02T00:00:00Z"),
      },
      {
        id: "m-1",
        ownerId: "acc-1",
        businessId: null,
        kind: "avatar",
        r2Key: "k1",
        mime: "image/png",
        size: 1,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
      {
        id: "m-foreign",
        ownerId: "acc-2",
        businessId: null,
        kind: "avatar",
        r2Key: "k3",
        mime: "image/png",
        size: 1,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
    ]);

    const page = await repo.listByOwner({ ownerId: "acc-1", limit: 20, offset: 0 });

    expect(page.items.map((item) => item.id)).toEqual(["m-1", "m-2"]);
  });

  it("pages the owner's media with offset", async () => {
    const repo = new InMemoryMediaRepository([
      {
        id: "m-1",
        ownerId: "acc-1",
        businessId: null,
        kind: "avatar",
        r2Key: "k1",
        mime: "image/png",
        size: 1,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
      {
        id: "m-2",
        ownerId: "acc-1",
        businessId: null,
        kind: "avatar",
        r2Key: "k2",
        mime: "image/png",
        size: 1,
        createdAt: new Date("2024-01-02T00:00:00Z"),
      },
    ]);

    const page = await repo.listByOwner({ ownerId: "acc-1", limit: 1, offset: 1 });

    expect(page.items.map((item) => item.id)).toEqual(["m-2"]);
    expect(page).toMatchObject({ limit: 1, offset: 1, nextOffset: 2 });
  });

  it("returns an empty page past the end", async () => {
    const repo = new InMemoryMediaRepository([
      {
        id: "m-1",
        ownerId: "acc-1",
        businessId: null,
        kind: "avatar",
        r2Key: "k1",
        mime: "image/png",
        size: 1,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
    ]);

    const page = await repo.listByOwner({ ownerId: "acc-1", limit: 1, offset: 5 });

    expect(page.items).toEqual([]);
    expect(page.nextOffset).toBeNull();
  });

  it("returns null for unknown id", async () => {
    const repo = new InMemoryMediaRepository([]);

    expect(await repo.getById("nope")).toBeNull();
  });

  it("deletes and reports success", async () => {
    const repo = new InMemoryMediaRepository([]);

    const created = await repo.create({
      ownerId: "acc-1",
      businessId: null,
      kind: "avatar",
      r2Key: "k1",
      mime: "image/png",
      size: 1,
    });

    expect(await repo.delete(created.id)).toBe(true);
    expect(await repo.getById(created.id)).toBeNull();
  });

  it("returns false when deleting unknown id", async () => {
    const repo = new InMemoryMediaRepository([]);

    expect(await repo.delete("nope")).toBe(false);
  });

  it("keeps the business scope of business media", async () => {
    const repo = new InMemoryMediaRepository([]);

    const created = await repo.create({
      ownerId: "acc-1",
      businessId: "biz-1",
      kind: "flyer",
      r2Key: "media/v1/acc-1/businesses/biz-1/flyer/key.jpg",
      mime: "image/jpeg",
      size: 1,
    });

    expect(created.businessId).toBe("biz-1");
  });

  it("finds a row by its absolute object key", async () => {
    const repo = new InMemoryMediaRepository([]);

    const created = await repo.create({
      ownerId: "acc-1",
      businessId: null,
      kind: "avatar",
      r2Key: "media/v1/acc-1/account/avatar/key.png",
      mime: "image/png",
      size: 1,
    });

    expect((await repo.findByR2Key(created.r2Key))?.id).toBe(created.id);
    expect(await repo.findByR2Key("missing")).toBeNull();
  });

  it("lists media for one business only", async () => {
    const repo = new InMemoryMediaRepository([
      {
        id: "m-1",
        ownerId: "acc-1",
        businessId: "biz-1",
        kind: "flyer",
        r2Key: "k1",
        mime: "image/jpeg",
        size: 1,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
      {
        id: "m-2",
        ownerId: "acc-1",
        businessId: "biz-2",
        kind: "flyer",
        r2Key: "k2",
        mime: "image/jpeg",
        size: 1,
        createdAt: new Date("2024-01-02T00:00:00Z"),
      },
    ]);

    const page = await repo.listByBusiness({ businessId: "biz-1", limit: 20, offset: 0 });

    expect(page.items.map((item) => item.id)).toEqual(["m-1"]);
  });

  it("returns every stored object key", async () => {
    const repo = new InMemoryMediaRepository([
      {
        id: "m-1",
        ownerId: "acc-1",
        businessId: null,
        kind: "avatar",
        r2Key: "k1",
        mime: "image/png",
        size: 1,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
      {
        id: "m-2",
        ownerId: "acc-2",
        businessId: null,
        kind: "avatar",
        r2Key: "k2",
        mime: "image/png",
        size: 1,
        createdAt: new Date("2024-01-02T00:00:00Z"),
      },
    ]);

    expect(await repo.listAllR2Keys()).toEqual(["k1", "k2"]);
  });
});
