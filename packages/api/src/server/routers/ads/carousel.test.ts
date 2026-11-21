import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { Flyer } from "@aqui-suena/api/domain/directory/flyer";
import { InMemoryFlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import type { Hour } from "@aqui-suena/api/domain/directory/hour";
import { InMemoryHourRepository } from "@aqui-suena/api/domain/directory/hour";
import { InMemoryMediaRepository, type Media } from "@aqui-suena/api/domain/media/media";
import { InMemoryObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { createCarouselRouter } from "@aqui-suena/api/server/routers/ads/carousel";
import { describe, expect, it } from "vitest";

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
    mediaId: `med-${businessId}`,
    url: null,
    replacedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeMedia(businessId: string): Media {
  return {
    id: `med-${businessId}`,
    ownerId: "acc-1",
    businessId,
    kind: "flyer",
    r2Key: `media/v1/acc/businesses/${businessId}/flyer/f.jpg`,
    mime: "image/jpeg",
    size: 1,
    createdAt: new Date(),
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
    billingInterval: "monthly",
    status: "active",
    startedAt: new Date(Date.now() - 1000),
    endsAt: new Date(Date.now() + 1000 * 60 * 60),
    graceEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeRouter(input: {
  businesses: Business[];
  flyers: Flyer[];
  hours: Hour[];
  subscriptions: Subscription[];
}) {
  return createCarouselRouter({
    businessRepository: new InMemoryBusinessRepository(input.businesses),
    flyerRepository: new InMemoryFlyerRepository(input.flyers),
    hourRepository: new InMemoryHourRepository(input.hours),
    subscriptionRepository: new InMemorySubscriptionRepository(input.subscriptions),
    mediaRepository: new InMemoryMediaRepository(
      input.flyers.map((flyer) => makeMedia(flyer.businessId)),
    ),
    storage: new InMemoryObjectStorage(),
  });
}

describe("ads.carousel", () => {
  it("returns an empty array when there are no businesses", async () => {
    const router = makeRouter({ businesses: [], flyers: [], hours: [], subscriptions: [] });
    const caller = router.createCaller({ user: null });

    expect(await caller.carousel()).toEqual([]);
  });

  it("returns businesses with flyers, ranked by plan and signs the flyer media", async () => {
    const community = makeBusiness({ id: "c-1", accountId: "acc-c", name: "Comunidad Biz" });
    const commerce = makeBusiness({ id: "m-1", accountId: "acc-m", name: "Comercio Biz" });
    const router = makeRouter({
      businesses: [community, commerce],
      flyers: [makeFlyer("c-1"), makeFlyer("m-1")],
      hours: [makeHour("c-1"), makeHour("m-1")],
      subscriptions: [makeSubscription("acc-m")],
    });
    const caller = router.createCaller({ user: null });

    const result = await caller.carousel();
    const names = result.map((item) => item.name);

    expect(names.filter((name) => name === "Comercio Biz")).toHaveLength(3);
    expect(names.filter((name) => name === "Comunidad Biz")).toHaveLength(1);
    expect(result[0]?.imageUrl).toContain("https://fake.r2/media/");
  });

  it("excludes businesses without a flyer", async () => {
    const b = makeBusiness({ id: "b-1" });
    const router = makeRouter({
      businesses: [b],
      flyers: [],
      hours: [makeHour("b-1")],
      subscriptions: [],
    });
    const caller = router.createCaller({ user: null });

    expect(await caller.carousel()).toEqual([]);
  });
});
