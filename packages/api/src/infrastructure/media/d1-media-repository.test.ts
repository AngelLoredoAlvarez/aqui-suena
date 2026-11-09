import { D1MediaRepository } from "@aqui-suena/api/infrastructure/media/d1-media-repository";
import { describe, expect, it } from "vitest";

describe("D1MediaRepository", () => {
  it("maps D1 rows into media (listByOwner)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "m-1",
                owner_id: "acc-1",
                kind: "avatar",
                r2_key: "avatar/acc-1/1",
                mime: "image/png",
                size: 512,
                created_at: 1700000000,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1MediaRepository(fakeDb);

    const list = await repository.listByOwner("acc-1");

    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("m-1");
    expect(list[0]?.ownerId).toBe("acc-1");
    expect(list[0]?.kind).toBe("avatar");
    expect(list[0]?.r2Key).toBe("avatar/acc-1/1");
    expect(list[0]?.mime).toBe("image/png");
    expect(list[0]?.size).toBe(512);
    expect(list[0]?.createdAt).toBeInstanceOf(Date);
    expect(list[0]?.createdAt.getTime()).toBe(1700000000 * 1000);
  });

  it("returns null when getById finds nothing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1MediaRepository(fakeDb);

    expect(await repository.getById("nonexistent")).toBeNull();
  });

  it("creates a media record and returns it with generated id and timestamp", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1MediaRepository(fakeDb);

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
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 1 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1MediaRepository(fakeDb);

    expect(await repository.delete("m-1")).toBe(true);
  });

  it("returns false when deleting a non-existent media", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1MediaRepository(fakeDb);

    expect(await repository.delete("nonexistent")).toBe(false);
  });
});
