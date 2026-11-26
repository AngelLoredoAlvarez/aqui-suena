import { hideBusinessesOutsideSelection } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/business-visibility";
import type { Business } from "@aqui-suena/api/domain/directory/model/business";
import { RETENTION_DAYS } from "@aqui-suena/api/domain/directory/rules/retention";
import { InMemoryBusinessRepository } from "@aqui-suena/api/infrastructure/memory/directory/in-memory-business-repository";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");

function business(id: string, overrides: Partial<Business> = {}): Business {
  return {
    id,
    accountId: "acc-1",
    name: `Business ${id}`,
    category: "food",
    phone: null,
    email: null,
    address: null,
    timezone: "America/Mexico_City",
    delivery: false,
    hiddenAt: null,
    retainedUntil: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("hideBusinessesOutsideSelection", () => {
  it("hides owned businesses that are not in the visible selection", async () => {
    const businesses = new InMemoryBusinessRepository([
      business("b1"),
      business("b2"),
      business("b3"),
    ]);

    await hideBusinessesOutsideSelection(businesses, "acc-1", ["b2"], NOW);

    const rows = await businesses.listAllByAccount("acc-1");
    const byId = new Map(rows.map((row) => [row.id, row]));

    expect(byId.get("b1")?.hiddenAt).toEqual(NOW);
    expect(byId.get("b3")?.hiddenAt).toEqual(NOW);
    expect(byId.get("b2")?.hiddenAt).toBeNull();
  });

  it("sets the retention deadline 90 days out from the hidden timestamp", async () => {
    const businesses = new InMemoryBusinessRepository([business("b1")]);

    await hideBusinessesOutsideSelection(businesses, "acc-1", [], NOW);

    const rows = await businesses.listAllByAccount("acc-1");
    const hidden = rows[0];

    const expectedDeadline = new Date(NOW);
    expectedDeadline.setDate(expectedDeadline.getDate() + RETENTION_DAYS);

    expect(hidden?.retainedUntil).toEqual(expectedDeadline);
    expect(hidden?.hiddenAt).toEqual(NOW);
  });

  it("leaves businesses already in the visible selection untouched", async () => {
    const businesses = new InMemoryBusinessRepository([business("b1"), business("b2")]);

    await hideBusinessesOutsideSelection(businesses, "acc-1", ["b1", "b2"], NOW);

    const rows = await businesses.listAllByAccount("acc-1");

    expect(rows.every((row) => row.hiddenAt === null && row.retainedUntil === null)).toBe(true);
  });
});
