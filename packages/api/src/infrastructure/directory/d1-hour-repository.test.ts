import { D1HourRepository } from "@aqui-suena/api/infrastructure/directory/d1-hour-repository";
import { describe, expect, it } from "vitest";

describe("D1HourRepository", () => {
  it("maps D1 rows into hours", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "hr-1",
                business_id: "biz-1",
                day: 1,
                open_minute: 540,
                close_minute: 1080,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1HourRepository(fakeDb);
    const hours = await repository.listByBusiness("biz-1");

    expect(hours).toHaveLength(1);
    expect(hours[0]?.id).toBe("hr-1");
    expect(hours[0]?.businessId).toBe("biz-1");
    expect(hours[0]?.day).toBe(1);
    expect(hours[0]?.openMinute).toBe(540);
    expect(hours[0]?.closeMinute).toBe(1080);
  });

  it("returns null when getById finds nothing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1HourRepository(fakeDb);
    const hour = await repository.getById("nonexistent");
    expect(hour).toBeNull();
  });

  it("lists only hours belonging to the given business", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "hr-1",
                business_id: "biz-1",
                day: 1,
                open_minute: 540,
                close_minute: 1080,
              },
            ],
          }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1HourRepository(fakeDb);
    const hours = await repository.listByBusiness("biz-1");

    expect(hours).toHaveLength(1);
    expect(hours[0]?.businessId).toBe("biz-1");
  });

  it("creates an hour and returns it with generated id", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1HourRepository(fakeDb);
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
    const existingRow = {
      id: "hr-1",
      business_id: "biz-1",
      day: 1,
      open_minute: 540,
      close_minute: 1080,
    };

    const fakeDb = {
      prepare: (sql: string) => {
        if (sql.includes("SELECT") && sql.includes("WHERE id = ?")) {
          return {
            bind: () => ({
              first: async () => existingRow,
            }),
          };
        }

        if (sql.includes("UPDATE")) {
          return {
            bind: () => ({
              run: async () => ({ success: true }),
            }),
          };
        }

        return {
          all: async () => ({ results: [] }),
          bind: () => ({ all: async () => ({ results: [] }), first: async () => null }),
        };
      },
    } as unknown as D1Database;

    const repository = new D1HourRepository(fakeDb);
    const updated = await repository.update("hr-1", {
      openMinute: 600,
      closeMinute: 1140,
    });

    expect(updated).not.toBeNull();
    expect(updated?.openMinute).toBe(600);
    expect(updated?.closeMinute).toBe(1140);
    expect(updated?.day).toBe(1);
    expect(updated?.businessId).toBe("biz-1");
  });

  it("returns null when updating a non-existent hour", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1HourRepository(fakeDb);
    const result = await repository.update("nonexistent", { day: 2 });
    expect(result).toBeNull();
  });

  it("deletes an existing hour and returns true", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 1 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1HourRepository(fakeDb);
    const deleted = await repository.delete("hr-1");
    expect(deleted).toBe(true);
  });

  it("returns false when deleting a non-existent hour", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
      }),
    } as unknown as D1Database;

    const repository = new D1HourRepository(fakeDb);
    const deleted = await repository.delete("nonexistent");
    expect(deleted).toBe(false);
  });
});
