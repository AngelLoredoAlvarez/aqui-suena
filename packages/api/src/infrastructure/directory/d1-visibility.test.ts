import { D1BusinessRepository } from "@aqui-suena/api/infrastructure/directory/d1-business-repository";
import { describe, expect, it } from "vitest";

function makeFakeDb() {
  const statements: string[] = [];
  const db = {
    prepare: (sql: string) => {
      statements.push(sql);

      return {
        all: async () => ({ results: [] }),
        first: async () => null,
        bind: () => ({
          all: async () => ({ results: [] }),
          first: async () => null,
        }),
      };
    },
  } as unknown as D1Database;

  return { db, statements };
}

describe("D1 public visibility queries", () => {
  it("filters hidden businesses from list and getById", async () => {
    const { db, statements } = makeFakeDb();
    const repository = new D1BusinessRepository(db);

    await repository.list({ limit: 20, cursor: null });
    await repository.getById("biz-1");

    expect(statements).toHaveLength(2);
    for (const sql of statements) {
      expect(sql).toMatch(/hidden_at IS NULL/);
    }
  });

  it("does not filter hidden businesses from the owner lookup", async () => {
    const { db, statements } = makeFakeDb();
    const repository = new D1BusinessRepository(db);

    await repository.getByIdForOwner("biz-1");
    await repository.listAllByAccount("acc-1");

    for (const sql of statements) {
      expect(sql).not.toMatch(/hidden_at IS NULL/);
    }
  });
});
