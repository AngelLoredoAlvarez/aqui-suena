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

describe("hours router", () => {
  it("lists hours from the repository", async () => {
    const repository = new InMemoryHourRepository([{ ...sample }]);
    const router = createHoursRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const hours = await caller.list();

    expect(hours).toHaveLength(1);
    expect(hours[0]?.id).toBe("hr-1");
  });

  it("returns null when getById finds nothing", async () => {
    const repository = new InMemoryHourRepository([]);
    const router = createHoursRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.getById("nonexistent")).toBeNull();
  });

  it("creates an hour with generated id", async () => {
    const repository = new InMemoryHourRepository([]);
    const router = createHoursRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
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
    const repository = new InMemoryHourRepository([{ ...sample }]);
    const router = createHoursRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const updated = await caller.update({ id: "hr-1", openMinute: 600 });

    expect(updated?.openMinute).toBe(600);
    expect(updated?.day).toBe(1);
  });

  it("returns null when updating a non-existent hour", async () => {
    const repository = new InMemoryHourRepository([]);
    const router = createHoursRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.update({ id: "nonexistent", day: 2 })).toBeNull();
  });

  it("deletes an hour and reports success", async () => {
    const repository = new InMemoryHourRepository([{ ...sample }]);
    const router = createHoursRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.delete("hr-1")).toBe(true);
  });
});
