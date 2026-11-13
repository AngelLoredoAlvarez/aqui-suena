import {
  type Business,
  InMemoryBusinessRepository,
} from "@aqui-suena/api/domain/directory/business";
import { encodeCursor } from "@aqui-suena/api/shared/pagination/cursor";
import { describe, expect, it } from "vitest";

function makeBusiness(id: string, createdAt: Date): Business {
  return {
    id,
    accountId: "acc-1",
    name: `Business ${id}`,
    category: "food",
    phone: null,
    email: null,
    address: null,
    timezone: "UTC",
    delivery: false,
    hiddenAt: null,
    retainedUntil: null,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("InMemoryBusinessRepository", () => {
  it("creates a business with no hidden/retention state", async () => {
    const repo = new InMemoryBusinessRepository([]);

    const business = await repo.create({
      accountId: "acc-1",
      name: "Casa Rosa",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "America/Mexico_City",
      delivery: true,
    });

    expect(business.hiddenAt).toBeNull();
    expect(business.retainedUntil).toBeNull();
  });

  it("purges businesses whose retention has expired", async () => {
    const repo = new InMemoryBusinessRepository([]);

    const visible = await repo.create({
      accountId: "acc-1",
      name: "Visible",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "UTC",
      delivery: false,
    });

    const expired = await repo.create({
      accountId: "acc-1",
      name: "Expired",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "UTC",
      delivery: false,
    });

    await repo.update(expired.id, {
      hiddenAt: new Date("2025-11-01T00:00:00Z"),
      retainedUntil: new Date("2026-01-01T00:00:00Z"),
    });

    const now = new Date("2026-02-01T00:00:00Z");

    const deleted = await repo.deleteExpired(now);

    expect(deleted).toBe(1);
    expect(await repo.getById(expired.id)).toBeNull();
    expect(await repo.getById(visible.id)).not.toBeNull();
  });

  it("does not purge businesses still within their retention window", async () => {
    const repo = new InMemoryBusinessRepository([]);

    const retained = await repo.create({
      accountId: "acc-1",
      name: "Retained",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "UTC",
      delivery: false,
    });

    await repo.update(retained.id, {
      hiddenAt: new Date("2026-01-01T00:00:00Z"),
      retainedUntil: new Date("2026-03-01T00:00:00Z"),
    });

    const now = new Date("2026-02-01T00:00:00Z");

    const deleted = await repo.deleteExpired(now);

    expect(deleted).toBe(0);
    expect(await repo.getByIdForOwner(retained.id)).not.toBeNull();
    expect(await repo.getById(retained.id)).toBeNull();
  });
});

describe("InMemoryBusinessRepository.list", () => {
  const a = makeBusiness("biz-a", new Date("2024-01-01T00:00:00Z"));

  const dateB = new Date("2024-01-02T00:00:00Z");
  const b = makeBusiness("biz-b", new Date("2024-01-02T00:00:00Z"));
  const epochB = Math.floor(dateB.getTime() / 1000);

  const c = makeBusiness("biz-c", new Date("2024-01-03T00:00:00Z"));

  it("returns all visible businesses sorted by (createdAt, id)", async () => {
    const repo = new InMemoryBusinessRepository([c, a, b]);

    const page = await repo.list({ limit: 20, cursor: null });

    expect(page.items.map((item) => item.id)).toEqual(["biz-a", "biz-b", "biz-c"]);
    expect(page.nextCursor).toBeNull();
  });

  it("returns limit items and a cursor when there are more", async () => {
    const repo = new InMemoryBusinessRepository([a, b, c]);

    const page = await repo.list({ limit: 2, cursor: null });

    expect(page.items.map((item) => item.id)).toEqual(["biz-a", "biz-b"]);
    expect(page.nextCursor).toBe(encodeCursor({ createdAt: epochB, id: "biz-b" }));
  });

  it("returns only businesses after the cursor", async () => {
    const repo = new InMemoryBusinessRepository([a, b, c]);
    const cursor = encodeCursor({ createdAt: epochB, id: "biz-b" });

    const page = await repo.list({ limit: 20, cursor });

    expect(page.items.map((item) => item.id)).toEqual(["biz-c"]);
    expect(page.nextCursor).toBeNull();
  });

  it("excludes hidden businesses", async () => {
    const hidden = {
      ...makeBusiness("biz-hidden", new Date("2024-01-04T00:00:00Z")),
      hiddenAt: new Date("2024-01-04T00:00:00Z"),
    };

    const repo = new InMemoryBusinessRepository([a, b, c, hidden]);

    const page = await repo.list({ limit: 20, cursor: null });

    expect(page.items.map((item) => item.id)).toEqual(["biz-a", "biz-b", "biz-c"]);
  });

  it("sorts by id when createdAt ties", async () => {
    const d = makeBusiness("biz-d", new Date("2024-01-01T00:00:00Z"));

    const repo = new InMemoryBusinessRepository([d, a]);

    const page = await repo.list({ limit: 20, cursor: null });

    expect(page.items.map((item) => item.id)).toEqual(["biz-a", "biz-d"]);
  });
});
