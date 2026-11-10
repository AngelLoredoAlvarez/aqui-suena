import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/subscriptions";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscriptions";
import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { Flyer } from "@aqui-suena/api/domain/directory/flyer";
import { InMemoryFlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import type { Hour } from "@aqui-suena/api/domain/directory/hour";
import { InMemoryHourRepository } from "@aqui-suena/api/domain/directory/hour";
import { describe, expect, it } from "vitest";

import { createCarouselRouter } from "./carousel";

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
  } as Business;
}

function makeFlyer(businessId: string): Flyer {
  return {
    id: `f-${businessId}`,
    businessId,
    url: "https://r2/flyer.png",
    replacedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeHour(businessId: string): Hour {
  return {
    id: `h-${businessId}`,
    businessId,
    day: 5,
    openMinute: 480,
    closeMinute: 1080,
  };
}

function makeSubscription(accountId: string): Subscription {
  return {
    id: `s-${accountId}`,
    accountId,
    planId: "commerce",
    status: "active",
    startedAt: new Date(Date.now() - 1000),
    endsAt: new Date(Date.now() + 1000 * 60 * 60),
    graceEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("ads.carousel", () => {
  it("returns an empty array when there are no businesses", async () => {
    const router = createCarouselRouter({
      businessRepository: new InMemoryBusinessRepository([]),
      flyerRepository: new InMemoryFlyerRepository([]),
      hourRepository: new InMemoryHourRepository([]),
      subscriptionRepository: new InMemorySubscriptionRepository([]),
    });

    const caller = router.createCaller({ user: null });

    const result = await caller.carousel();

    expect(result).toEqual([]);
  });

  it("returns businesses with flyers, ranked by plan", async () => {
    const community = makeBusiness({ id: "c-1", accountId: "acc-c", name: "Comunidad Biz" });
    const commerce = makeBusiness({ id: "m-1", accountId: "acc-m", name: "Comercio Biz" });

    const router = createCarouselRouter({
      businessRepository: new InMemoryBusinessRepository([community, commerce]),
      flyerRepository: new InMemoryFlyerRepository([makeFlyer("c-1"), makeFlyer("m-1")]),
      hourRepository: new InMemoryHourRepository([makeHour("c-1"), makeHour("m-1")]),
      subscriptionRepository: new InMemorySubscriptionRepository([makeSubscription("acc-m")]),
    });

    const caller = router.createCaller({ user: null });

    const result = await caller.carousel();

    const names = result.map((i) => i.name);
    expect(names.filter((n) => n === "Comercio Biz")).toHaveLength(3);
    expect(names.filter((n) => n === "Comunidad Biz")).toHaveLength(1);
  });

  it("excludes businesses without a flyer", async () => {
    const b = makeBusiness({ id: "b-1" });

    const router = createCarouselRouter({
      businessRepository: new InMemoryBusinessRepository([b]),
      flyerRepository: new InMemoryFlyerRepository([]),
      hourRepository: new InMemoryHourRepository([makeHour("b-1")]),
      subscriptionRepository: new InMemorySubscriptionRepository([]),
    });

    const caller = router.createCaller({ user: null });

    const result = await caller.carousel();

    expect(result).toEqual([]);
  });
});
