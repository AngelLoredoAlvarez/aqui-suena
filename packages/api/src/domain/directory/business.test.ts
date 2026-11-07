import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { describe, expect, it } from "vitest";

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
    expect(await repo.getById(retained.id)).not.toBeNull();
  });
});
