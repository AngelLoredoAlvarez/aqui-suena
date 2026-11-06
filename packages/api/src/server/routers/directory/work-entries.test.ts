import { InMemoryWorkEntryRepository } from "@aqui-suena/api/domain/directory/work-entry";
import { createWorkEntriesRouter } from "@aqui-suena/api/server/routers/directory/work-entries";
import { describe, expect, it } from "vitest";

const sample = {
  id: "we-1",
  businessId: "biz-1",
  title: "Reparacion de laptop",
  description: "Cambio de pantalla",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("work entries router", () => {
  it("lists work entries from the repository", async () => {
    const repository = new InMemoryWorkEntryRepository([{ ...sample }]);
    const router = createWorkEntriesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const entries = await caller.list();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("we-1");
  });

  it("returns null when getById finds nothing", async () => {
    const repository = new InMemoryWorkEntryRepository([]);
    const router = createWorkEntriesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.getById("nonexistent")).toBeNull();
  });

  it("creates a work entry with generated id", async () => {
    const repository = new InMemoryWorkEntryRepository([]);
    const router = createWorkEntriesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const created = await caller.create({
      businessId: "biz-1",
      title: "Reparacion",
      description: null,
    });

    expect(created.id).toBeTruthy();
    expect(created.title).toBe("Reparacion");
  });

  it("updates a work entry and preserves unprovided fields", async () => {
    const repository = new InMemoryWorkEntryRepository([{ ...sample }]);
    const router = createWorkEntriesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const updated = await caller.update({ id: "we-1", title: "Reparacion de PC" });

    expect(updated?.title).toBe("Reparacion de PC");
    expect(updated?.description).toBe("Cambio de pantalla");
  });

  it("returns null when updating a non-existent work entry", async () => {
    const repository = new InMemoryWorkEntryRepository([]);
    const router = createWorkEntriesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.update({ id: "nonexistent", title: "X" })).toBeNull();
  });

  it("deletes a work entry and reports success", async () => {
    const repository = new InMemoryWorkEntryRepository([{ ...sample }]);
    const router = createWorkEntriesRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.delete("we-1")).toBe(true);
  });
});
