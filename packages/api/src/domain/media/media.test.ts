import { describe, expect, it } from "vitest";
import { InMemoryMediaRepository } from "./media";

describe("InMemoryMediaRepository", () => {
  it("creates a media record with generated id and createdAt", async () => {
    const repo = new InMemoryMediaRepository([]);

    const created = await repo.create({
      ownerId: "acc-1",
      kind: "avatar",
      r2Key: "avatar/acc-1/1",
      mime: "image/png",
      size: 512,
    });

    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.r2Key).toBe("avatar/acc-1/1");
  });

  it("lists media by owner", async () => {
    const repo = new InMemoryMediaRepository([]);

    await repo.create({
      ownerId: "acc-1",
      kind: "avatar",
      r2Key: "k1",
      mime: "image/png",
      size: 1,
    });

    await repo.create({
      ownerId: "acc-2",
      kind: "avatar",
      r2Key: "k2",
      mime: "image/png",
      size: 1,
    });

    const list = await repo.listByOwner("acc-1");

    expect(list).toHaveLength(1);
    expect(list[0]?.r2Key).toBe("k1");
  });

  it("returns null for unknown id", async () => {
    const repo = new InMemoryMediaRepository([]);

    expect(await repo.getById("nope")).toBeNull();
  });

  it("deletes and reports success", async () => {
    const repo = new InMemoryMediaRepository([]);

    const created = await repo.create({
      ownerId: "acc-1",
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
});
