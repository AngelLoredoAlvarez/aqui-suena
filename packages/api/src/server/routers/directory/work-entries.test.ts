import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
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

function setup(workEntries = [sample]) {
  const repository = new InMemoryWorkEntryRepository(workEntries);
  const router = createWorkEntriesRouter({
    workEntry: repository,
    business: new InMemoryBusinessRepository([business]),
  });
  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, caller };
}

describe("work entries router", () => {
  it("lists work entries from the repository", async () => {
    const { caller } = setup();
    const entries = await caller.list();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("we-1");
  });

  it("returns null when getById finds nothing", async () => {
    const { caller } = setup([]);

    expect(await caller.getById("nonexistent")).toBeNull();
  });

  it("creates a work entry with generated id", async () => {
    const { caller } = setup([]);
    const created = await caller.create({
      businessId: "biz-1",
      title: "Reparacion",
      description: null,
    });

    expect(created.id).toBeTruthy();
    expect(created.title).toBe("Reparacion");
  });

  it("updates a work entry and preserves unprovided fields", async () => {
    const { caller } = setup();
    const updated = await caller.update({ id: "we-1", title: "Reparacion de PC" });

    expect(updated?.title).toBe("Reparacion de PC");
    expect(updated?.description).toBe("Cambio de pantalla");
  });

  it("rejects updating a non-existent work entry with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.update({ id: "nonexistent", title: "X" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes a work entry and reports success", async () => {
    const { caller } = setup();

    expect(await caller.delete("we-1")).toBe(true);
  });
});
