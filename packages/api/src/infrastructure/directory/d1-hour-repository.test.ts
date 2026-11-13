import { D1HourRepository } from "@aqui-suena/api/infrastructure/directory/d1-hour-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "hr-1",
  business_id: "biz-1",
  day: 1,
  open_minute: 540,
  close_minute: 1080,
};

describe("D1HourRepository", () => {
  it("maps D1 rows into hours", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1HourRepository(fake.db);

    const hours = await repository.listByBusiness("biz-1");

    expect(hours).toHaveLength(1);
    expect(hours[0]?.id).toBe("hr-1");
    expect(hours[0]?.businessId).toBe("biz-1");
    expect(hours[0]?.day).toBe(1);
    expect(hours[0]?.openMinute).toBe(540);
    expect(hours[0]?.closeMinute).toBe(1080);
  });

  it("returns null when getById finds nothing", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1HourRepository(fake.db);

    expect(await repository.getById("nonexistent")).toBeNull();
  });

  it("lists only hours belonging to the given business", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1HourRepository(fake.db);

    const hours = await repository.listByBusiness("biz-1");

    expect(hours).toHaveLength(1);
    expect(hours[0]?.businessId).toBe("biz-1");
    expect(fake.statements[0]?.sql).toMatch(/WHERE business_id = \? ORDER BY day/);
  });

  it("creates an hour and returns it with generated id", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repository = new D1HourRepository(fake.db);

    const hour = await repository.create({
      businessId: "biz-1",
      day: 1,
      openMinute: 540,
      closeMinute: 1080,
    });

    expect(hour).not.toBeNull();
    expect(hour.id).toBeTruthy();
    expect(hour.businessId).toBe("biz-1");
    expect(hour.day).toBe(1);
    expect(hour.openMinute).toBe(540);
    expect(hour.closeMinute).toBe(1080);
  });

  it("updates only the provided fields and preserves the rest", async () => {
    const fake = new FakeD1Database(({ sql }) => {
      if (sql.includes("WHERE id = ?")) return { first: sampleRow };

      return { run: { success: true } };
    });
    const repository = new D1HourRepository(fake.db);

    const updated = await repository.update("hr-1", { openMinute: 600, closeMinute: 1140 });

    expect(updated).not.toBeNull();
    expect(updated?.openMinute).toBe(600);
    expect(updated?.closeMinute).toBe(1140);
    expect(updated?.day).toBe(1);
    expect(updated?.businessId).toBe("biz-1");
  });

  it("returns null when updating a non-existent hour", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1HourRepository(fake.db);

    expect(await repository.update("nonexistent", { day: 2 })).toBeNull();
  });

  it("deletes an existing hour and returns true", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 1 } }));
    const repository = new D1HourRepository(fake.db);

    expect(await repository.delete("hr-1")).toBe(true);
  });

  it("returns false when deleting a non-existent hour", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 0 } }));
    const repository = new D1HourRepository(fake.db);

    expect(await repository.delete("nonexistent")).toBe(false);
  });
});
