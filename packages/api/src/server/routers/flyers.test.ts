import { InMemoryFlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { describe, expect, it } from "vitest";
import { createFlyersRouter } from "./flyers";

const sample = {
  id: "fly-1",
  businessId: "biz-1",
  url: "https://example.com/old.jpg",
  replacedAt: new Date("2024-01-01T00:00:00Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("flyers router", () => {
  it("lists flyers from the repository", async () => {
    const repository = new InMemoryFlyerRepository([{ ...sample }]);
    const router = createFlyersRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const flyers = await caller.list();

    expect(flyers).toHaveLength(1);
    expect(flyers[0]?.id).toBe("fly-1");
  });

  it("returns null when getById finds nothing", async () => {
    const repository = new InMemoryFlyerRepository([]);
    const router = createFlyersRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.getById("nonexistent")).toBeNull();
  });

  it("creates a flyer with generated id", async () => {
    const repository = new InMemoryFlyerRepository([]);
    const router = createFlyersRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const created = await caller.create({
      businessId: "biz-1",
      url: "https://example.com/new.jpg",
    });

    expect(created.id).toBeTruthy();
    expect(created.url).toBe("https://example.com/new.jpg");
  });

  it("updates a flyer url and bumps replacedAt", async () => {
    const repository = new InMemoryFlyerRepository([{ ...sample }]);
    const router = createFlyersRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const updated = await caller.update({ id: "fly-1", url: "https://example.com/new.jpg" });

    expect(updated?.url).toBe("https://example.com/new.jpg");
    expect(updated?.replacedAt.getTime()).toBeGreaterThan(sample.replacedAt.getTime());
  });

  it("returns null when updating a non-existent flyer", async () => {
    const repository = new InMemoryFlyerRepository([]);
    const router = createFlyersRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.update({ id: "nonexistent", url: "https://example.com/x.jpg" })).toBeNull();
  });

  it("deletes a flyer and reports success", async () => {
    const repository = new InMemoryFlyerRepository([{ ...sample }]);
    const router = createFlyersRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.delete("fly-1")).toBe(true);
  });
});
