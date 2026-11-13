import { D1BusinessRepository } from "@aqui-suena/api/infrastructure/directory/d1-business-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

describe("D1 public visibility queries", () => {
  it("filters hidden businesses from list and getById", async () => {
    const fake = new FakeD1Database();
    const repository = new D1BusinessRepository(fake.db);

    await repository.list({ limit: 20, cursor: null });
    await repository.getById("biz-1");

    expect(fake.statements).toHaveLength(2);
    for (const { sql } of fake.statements) {
      expect(sql).toMatch(/hidden_at IS NULL/);
    }
  });

  it("does not filter hidden businesses from the owner lookup", async () => {
    const fake = new FakeD1Database();
    const repository = new D1BusinessRepository(fake.db);

    await repository.getByIdForOwner("biz-1");
    await repository.listAllByAccount("acc-1");

    for (const { sql } of fake.statements) {
      expect(sql).not.toMatch(/hidden_at IS NULL/);
    }
  });
});
