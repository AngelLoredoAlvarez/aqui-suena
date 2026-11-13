import { D1BusinessRepository } from "@aqui-suena/api/infrastructure/directory/d1-business-repository";
import { D1FlyerRepository } from "@aqui-suena/api/infrastructure/directory/d1-flyer-repository";
import { D1HourRepository } from "@aqui-suena/api/infrastructure/directory/d1-hour-repository";
import { D1PhotoRepository } from "@aqui-suena/api/infrastructure/directory/d1-photo-repository";
import { D1ProductRepository } from "@aqui-suena/api/infrastructure/directory/d1-product-repository";
import { D1ServiceRepository } from "@aqui-suena/api/infrastructure/directory/d1-service-repository";
import { D1WorkEntryRepository } from "@aqui-suena/api/infrastructure/directory/d1-work-entry-repository";
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
    await repository.listByAccount("acc-1");

    for (const sql of statements) {
      expect(sql).not.toMatch(/hidden_at IS NULL/);
    }
  });

  it("joins the parent business on every public child list", async () => {
    const { db, statements } = makeFakeDb();

    const repositories = [
      new D1ProductRepository(db),
      new D1ServiceRepository(db),
      new D1PhotoRepository(db),
      new D1HourRepository(db),
      new D1WorkEntryRepository(db),
    ];

    for (const repository of repositories) {
      await repository.list();
    }

    await new D1FlyerRepository(db).list({ limit: 20, cursor: null });

    expect(statements).toHaveLength(repositories.length + 1);
    for (const sql of statements) {
      expect(sql).toMatch(/JOIN businesses/);
      expect(sql).toMatch(/hidden_at IS NULL/);
    }
  });
});
