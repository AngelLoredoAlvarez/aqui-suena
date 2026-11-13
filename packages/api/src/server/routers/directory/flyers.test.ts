import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { InMemoryFlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { createFlyersRouter } from "@aqui-suena/api/server/routers/directory/flyers";
import { describe, expect, it } from "vitest";

const sample = {
  id: "fly-1",
  businessId: "biz-1",
  url: "https://example.com/old.jpg",
  replacedAt: new Date("2024-01-01T00:00:00Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

const business: Business = {
  id: "biz-1",
  accountId: "acc-1",
  name: "Tacos El Güero",
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

function setup(flyers = [sample]) {
  const repository = new InMemoryFlyerRepository(flyers);
  const router = createFlyersRouter({
    flyer: repository,
    business: new InMemoryBusinessRepository([business]),
  });
  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, caller };
}

describe("flyers router", () => {
  it("lists flyers from the repository", async () => {
    const { caller } = setup();
    const page = await caller.list();

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("fly-1");
  });

  it("rejects getById with NOT_FOUND when nothing matches", async () => {
    const { caller } = setup([]);

    await expect(caller.getById("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.getById(123 as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects deleting a missing flyer with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.delete("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates a flyer with generated id", async () => {
    const { caller } = setup([]);
    const created = await caller.create({
      businessId: "biz-1",
      url: "https://example.com/new.jpg",
    });

    expect(created.id).toBeTruthy();
    expect(created.url).toBe("https://example.com/new.jpg");
  });

  it("updates a flyer url and bumps replacedAt", async () => {
    const { caller } = setup();
    const updated = await caller.update({ id: "fly-1", url: "https://example.com/new.jpg" });

    expect(updated?.url).toBe("https://example.com/new.jpg");
    expect(updated?.replacedAt.getTime()).toBeGreaterThan(sample.replacedAt.getTime());
  });

  it("rejects updating a non-existent flyer with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(
      caller.update({ id: "nonexistent", url: "https://example.com/x.jpg" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes a flyer and reports success", async () => {
    const { caller } = setup();

    expect(await caller.delete("fly-1")).toBe(true);
  });
});
