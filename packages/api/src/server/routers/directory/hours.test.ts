import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { type Hour, InMemoryHourRepository } from "@aqui-suena/api/domain/directory/hour";
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

function setup(hours: Hour[] = [sample], businesses: Business[] = [business]) {
  const repository = new InMemoryHourRepository(hours);
  const router = createHoursRouter({
    hour: repository,
    business: new InMemoryBusinessRepository(businesses),
  });
  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, caller };
}

describe("hours router", () => {
  it("lists hours from the repository scoped to a business", async () => {
    const { caller } = setup();
    const hours = await caller.listByBusiness({ businessId: "biz-1" });

    expect(hours).toHaveLength(1);
    expect(hours[0]?.id).toBe("hr-1");
  });

  it("orders hours by day", async () => {
    const { caller } = setup([
      { ...sample, id: "hr-2", day: 3, openMinute: 540, closeMinute: 1080 },
      sample,
    ]);

    const hours = await caller.listByBusiness({ businessId: "biz-1" });

    expect(hours.map((hour) => hour.day)).toEqual([1, 3]);
  });

  it("rejects listing hours of a hidden business with NOT_FOUND", async () => {
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

  it("rejects deleting a missing hour with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.delete("nonexistent")).rejects.toMatchObject({ code: "NOT_FOUND" });
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
