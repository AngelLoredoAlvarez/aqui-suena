import {
  type Business,
  InMemoryBusinessRepository,
} from "@aqui-suena/api/domain/directory/business";
import { type Flyer, InMemoryFlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { describe, expect, it } from "vitest";

function makeBusiness(id: string, hidden: boolean): Business {
  return {
    id,
    accountId: "acc-1",
    name: `Business ${id}`,
    category: "food",
    phone: null,
    email: null,
    address: null,
    timezone: "UTC",
    delivery: false,
    hiddenAt: hidden ? new Date("2024-01-01T00:00:00Z") : null,
    retainedUntil: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };
}

function makeFlyer(id: string, businessId: string, createdAt: Date): Flyer {
  return {
    id,
    businessId,
    url: `https://example.com/${id}.png`,
    replacedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("InMemoryFlyerRepository.list", () => {
  const visible = makeBusiness("biz-visible", false);
  const hidden = makeBusiness("biz-hidden", true);

  const a = makeFlyer("flyer-a", "biz-visible", new Date("2024-01-01T00:00:00Z"));
  const b = makeFlyer("flyer-b", "biz-visible", new Date("2024-01-02T00:00:00Z"));
  const c = makeFlyer("flyer-c", "biz-visible", new Date("2024-01-03T00:00:00Z"));
  const hiddenFlyer = makeFlyer("flyer-hidden", "biz-hidden", new Date("2024-01-04T00:00:00Z"));

  it("returns only flyers of visible businesses, sorted", async () => {
    const repo = new InMemoryFlyerRepository(
      [c, a, b, hiddenFlyer],
      new InMemoryBusinessRepository([visible, hidden]),
    );

    const page = await repo.list({ limit: 20, cursor: null });

    expect(page.items.map((item) => item.id)).toEqual(["flyer-a", "flyer-b", "flyer-c"]);
    expect(page.nextCursor).toBeNull();
  });

  it("returns limit items and a cursor when there are more", async () => {
    const repo = new InMemoryFlyerRepository([a, b, c], new InMemoryBusinessRepository([visible]));

    const page = await repo.list({ limit: 2, cursor: null });

    expect(page.items.map((item) => item.id)).toEqual(["flyer-a", "flyer-b"]);
    expect(page.nextCursor).not.toBeNull();
  });

  it("returns all flyers when no business repository is provided", async () => {
    const repo = new InMemoryFlyerRepository([b, a, c]);

    const page = await repo.list({ limit: 20, cursor: null });

    expect(page.items.map((item) => item.id)).toEqual(["flyer-a", "flyer-b", "flyer-c"]);
  });
});
