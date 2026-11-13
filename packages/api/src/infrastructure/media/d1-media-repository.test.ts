import { D1MediaRepository } from "@aqui-suena/api/infrastructure/media/d1-media-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "m-1",
  owner_id: "acc-1",
  kind: "avatar",
  r2_key: "avatar/acc-1/1",
  mime: "image/png",
  size: 512,
  created_at: 1700000000,
};

describe("D1MediaRepository", () => {
  it("maps D1 rows into media (listByOwner)", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1MediaRepository(fake.db);

    const page = await repository.listByOwner({ ownerId: "acc-1", limit: 20, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("m-1");
    expect(page.items[0]?.ownerId).toBe("acc-1");
    expect(page.items[0]?.kind).toBe("avatar");
    expect(page.items[0]?.r2Key).toBe("avatar/acc-1/1");
    expect(page.items[0]?.mime).toBe("image/png");
    expect(page.items[0]?.size).toBe(512);
    expect(page.items[0]?.createdAt).toBeInstanceOf(Date);
    expect(page.items[0]?.createdAt.getTime()).toBe(1700000000 * 1000);
  });

  it("pages by owner with deterministic order, LIMIT and OFFSET", async () => {
    const fake = new FakeD1Database();
    const repository = new D1MediaRepository(fake.db);

    await repository.listByOwner({ ownerId: "acc-1", limit: 5, offset: 10 });

    expect(fake.statements[0]?.sql).toMatch(
      /WHERE owner_id = \? ORDER BY created_at, id LIMIT \? OFFSET \?/,
    );
    expect(fake.statements[0]?.params).toEqual(["acc-1", 5, 10]);
  });

  it("returns null when getById finds nothing", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1MediaRepository(fake.db);

    expect(await repository.getById("nonexistent")).toBeNull();
  });

  it("creates a media record and returns it with generated id and timestamp", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repository = new D1MediaRepository(fake.db);

    const media = await repository.create({
      ownerId: "acc-1",
      kind: "avatar",
      r2Key: "avatar/acc-1/1",
      mime: "image/png",
      size: 512,
    });

    expect(media).not.toBeNull();
    expect(media.id).toBeTruthy();
    expect(media.ownerId).toBe("acc-1");
    expect(media.kind).toBe("avatar");
    expect(media.r2Key).toBe("avatar/acc-1/1");
    expect(media.mime).toBe("image/png");
    expect(media.size).toBe(512);
    expect(media.createdAt).toBeInstanceOf(Date);
  });

  it("deletes an existing media and returns true", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 1 } }));
    const repository = new D1MediaRepository(fake.db);

    expect(await repository.delete("m-1")).toBe(true);
  });

  it("returns false when deleting a non-existent media", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 0 } }));
    const repository = new D1MediaRepository(fake.db);

    expect(await repository.delete("nonexistent")).toBe(false);
  });
});
