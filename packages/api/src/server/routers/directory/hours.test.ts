import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { InMemoryHourRepository } from "@aqui-suena/api/domain/directory/hour";
import { createHoursRouter } from "@aqui-suena/api/server/routers/directory/hours";
import { describe, expect, it } from "vitest";

const sample = {
  id: "hr-1",
  businessId: "biz-1",
  day: 1,
  openMinute: 540,
  closeMinute: 1080,
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

function setup(hours = [sample]) {
  const repository = new InMemoryHourRepository(hours);
  const router = createHoursRouter({
    hour: repository,
    business: new InMemoryBusinessRepository([business]),
  });
  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, caller };
}

describe("hours router", () => {
  it("lists hours from the repository", async () => {
    const { caller } = setup();
    const hours = await caller.list();

    expect(hours).toHaveLength(1);
    expect(hours[0]?.id).toBe("hr-1");
  });

  it("returns null when getById finds nothing", async () => {
    const { caller } = setup([]);

    expect(await caller.getById("nonexistent")).toBeNull();
  });

  it("creates an hour with generated id", async () => {
    const { caller } = setup([]);
    const created = await caller.create({
      businessId: "biz-1",
      day: 1,
      openMinute: 540,
      closeMinute: 1080,
    });

    expect(created.id).toBeTruthy();
    expect(created.day).toBe(1);
  });

  it("updates an hour and preserves unprovided fields", async () => {
    const { caller } = setup();
    const updated = await caller.update({ id: "hr-1", openMinute: 600 });

    expect(updated?.openMinute).toBe(600);
    expect(updated?.day).toBe(1);
  });

  it("rejects updating a non-existent hour with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.update({ id: "nonexistent", day: 2 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes an hour and reports success", async () => {
    const { caller } = setup();

    expect(await caller.delete("hr-1")).toBe(true);
  });
});
