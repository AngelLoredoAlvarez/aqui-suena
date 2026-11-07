import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions";
import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { Flyer } from "@aqui-suena/api/domain/directory/flyer";
import { InMemoryFlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import type { Hour } from "@aqui-suena/api/domain/directory/hour";
import { InMemoryHourRepository } from "@aqui-suena/api/domain/directory/hour";
import { describe, expect, it } from "vitest";

import { type BusinessCarouselDeps, getBusinessCarousel } from "./business-carousel";

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "b-1",
    accountId: "acc-1",
    name: "Casa Rosa",
    category: "food",
    phone: null,
    email: null,
    address: null,
    timezone: "America/Mexico_City",
    delivery: true,
    hiddenAt: null,
    retainedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date("2026-11-06T10:00:00-06:00"),
    ...overrides,
  };
}

function makeFlyer(businessId: string, url = "https://r2/flyer.png"): Flyer {
  return {
    id: `f-${businessId}`,
    businessId,
    url,
    replacedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeHour(businessId: string, day = 5): Hour {
  return {
    id: `h-${businessId}`,
    businessId,
    day,
    openMinute: 480,
    closeMinute: 1080,
  };
}

function makeSubscription(accountId: string, planId: Subscription["planId"]): Subscription {
  return {
    id: `s-${accountId}`,
    accountId,
    planId,
    status: "active",
    startedAt: new Date(Date.now() - 1000),
    endsAt: new Date(Date.now() + 1000 * 60 * 60),
    graceEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeDeps(
  businesses: Business[],
  flyers: Flyer[] = [],
  hours: Hour[] = [],
  subs: Subscription[] = [],
): BusinessCarouselDeps {
  return {
    businessRepository: new InMemoryBusinessRepository(businesses),
    flyerRepository: new InMemoryFlyerRepository(flyers),
    hourRepository: new InMemoryHourRepository(hours),
    subscriptionRepository: new InMemorySubscriptionRepository(subs),
  };
}

const now = new Date("2026-11-06T12:00:00-06:00");

describe("getBusinessCarousel", () => {
  it("returns an empty array when there are no businesses", async () => {
    const deps = makeDeps([]);
    const result = await getBusinessCarousel(deps, now);

    expect(result).toEqual([]);
  });

  it("excludes businesses without a flyer", async () => {
    const b = makeBusiness({ id: "b-1" });
    const deps = makeDeps([b], [], [makeHour("b-1")], []);
    const result = await getBusinessCarousel(deps, now);

    expect(result).toEqual([]);
  });

  it("gives commerce 3 appearances and community 1, interleaved", async () => {
    const community = makeBusiness({ id: "c-1", accountId: "acc-c", name: "Comunidad Biz" });
    const commerce = makeBusiness({ id: "m-1", accountId: "acc-m", name: "Comercio Biz" });
    const deps = makeDeps(
      [community, commerce],
      [makeFlyer("c-1"), makeFlyer("m-1")],
      [makeHour("c-1"), makeHour("m-1")],
      [makeSubscription("acc-m", "commerce")],
    );

    const result = await getBusinessCarousel(deps, now);
    const names = result.map((i) => i.name);

    expect(names.filter((n) => n === "Comercio Biz")).toHaveLength(3);
    expect(names.filter((n) => n === "Comunidad Biz")).toHaveLength(1);

    let consecutivePairs = 0;
    for (let i = 1; i < names.length; i++) {
      if (names[i] === names[i - 1]) consecutivePairs++;
    }
    expect(consecutivePairs).toBeLessThanOrEqual(1);
  });

  it("uses recency as tie-breaker within the same plan", async () => {
    const older = makeBusiness({
      id: "o-1",
      accountId: "acc-o",
      name: "Older",
      updatedAt: new Date("2026-11-05T10:00:00-06:00"),
    });
    const newer = makeBusiness({
      id: "n-1",
      accountId: "acc-n",
      name: "Newer",
      updatedAt: new Date("2026-11-06T09:00:00-06:00"),
    });
    const deps = makeDeps(
      [older, newer],
      [makeFlyer("o-1"), makeFlyer("n-1")],
      [makeHour("o-1"), makeHour("n-1")],
      [],
    );

    const result = await getBusinessCarousel(deps, now);

    expect(result.map((i) => i.name)).toEqual(["Newer", "Older"]);
  });

  it("derives isOpen from hours + timezone + now", async () => {
    const b = makeBusiness({ id: "b-1" });
    const deps = makeDeps([b], [makeFlyer("b-1")], [makeHour("b-1", 5)], []);

    const result = await getBusinessCarousel(deps, now);

    expect(result[0]?.isOpen).toBe(true);
  });
});
