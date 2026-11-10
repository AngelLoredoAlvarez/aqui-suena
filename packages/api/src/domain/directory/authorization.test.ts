import {
  assertOwnsBusiness,
  BusinessAccessDeniedError,
} from "@aqui-suena/api/domain/directory/authorization";
import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { describe, expect, it } from "vitest";

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
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
    ...overrides,
  };
}

describe("assertOwnsBusiness", () => {
  it("returns the business when the account owns it", async () => {
    const repository = new InMemoryBusinessRepository([makeBusiness()]);

    const business = await assertOwnsBusiness(repository, "acc-1", "biz-1");

    expect(business.id).toBe("biz-1");
  });

  it("rejects a business owned by another account", async () => {
    const repository = new InMemoryBusinessRepository([makeBusiness({ accountId: "acc-2" })]);

    await expect(assertOwnsBusiness(repository, "acc-1", "biz-1")).rejects.toBeInstanceOf(
      BusinessAccessDeniedError,
    );
  });

  it("rejects a missing business", async () => {
    const repository = new InMemoryBusinessRepository([]);

    await expect(assertOwnsBusiness(repository, "acc-1", "missing")).rejects.toBeInstanceOf(
      BusinessAccessDeniedError,
    );
  });
});
