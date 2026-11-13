import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import {
  InMemoryWorkEntryRepository,
  type WorkEntry,
} from "@aqui-suena/api/domain/directory/work-entry";
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

function setup(workEntries: WorkEntry[] = [sample], businesses: Business[] = [business]) {
  const repository = new InMemoryWorkEntryRepository(workEntries);
  const router = createWorkEntriesRouter({
    workEntry: repository,
    business: new InMemoryBusinessRepository(businesses),
  });
  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, caller };
}

describe("work entries router", () => {
  it("lists work entries from the repository scoped to a business", async () => {
    const { caller } = setup();
    const page = await caller.listByBusiness({ businessId: "biz-1" });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("we-1");
  });

  it("pages work entries by business and rejects out-of-range values", async () => {
    const { caller } = setup([
      sample,
      { ...sample, id: "we-2", createdAt: new Date("2024-01-02T00:00:00Z") },
    ]);
    const first = await caller.listByBusiness({ businessId: "biz-1", limit: 1 });

    expect(first.items).toHaveLength(1);
    expect(first.nextOffset).toBe(1);

    await expect(caller.listByBusiness({ businessId: "biz-1", limit: 101 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects listing work entries of a hidden business with NOT_FOUND", async () => {
    const { caller } = setup([], [{ ...business, hiddenAt: new Date("2024-02-01T00:00:00Z") }]);

    await expect(caller.listByBusiness({ businessId: "biz-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects getById with NOT_FOUND when nothing matches", async () => {
    const { caller } = setup([]);

    await expect(caller.getById("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a malformed id with BAD_REQUEST", async () => {
    const { caller } = setup();

    await expect(caller.getById(123 as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects deleting a missing work entry with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.delete("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
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
