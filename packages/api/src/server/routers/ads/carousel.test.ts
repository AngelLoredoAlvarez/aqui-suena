import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import type { Business } from "@aqui-suena/api/domain/directory/model/business";
import type { Flyer } from "@aqui-suena/api/domain/directory/model/flyer";
import type { Hour } from "@aqui-suena/api/domain/directory/model/hour";
import type { Media } from "@aqui-suena/api/domain/media/media";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/infrastructure/memory/billing/in-memory-subscription-repository";
import { InMemoryBusinessRepository } from "@aqui-suena/api/infrastructure/memory/directory/in-memory-business-repository";
import { InMemoryFlyerRepository } from "@aqui-suena/api/infrastructure/memory/directory/in-memory-flyer-repository";
import { InMemoryHourRepository } from "@aqui-suena/api/infrastructure/memory/directory/in-memory-hour-repository";
import { InMemoryMediaRepository } from "@aqui-suena/api/infrastructure/memory/media/in-memory-media-repository";
import { InMemoryObjectStorage } from "@aqui-suena/api/infrastructure/memory/media/in-memory-object-storage";
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
  media?: Media[];
}) {
  return createCarouselRouter({
    businessRepository: new InMemoryBusinessRepository(input.businesses),
    flyerRepository: new InMemoryFlyerRepository(input.flyers),
    hourRepository: new InMemoryHourRepository(input.hours),
    subscriptionRepository: new InMemorySubscriptionRepository(input.subscriptions),
    mediaRepository: new InMemoryMediaRepository(
      input.media ?? input.flyers.map((flyer) => makeMedia(flyer.businessId)),
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

  it("returns businesses with flyers, ranked by plan and using the public flyer URL", async () => {
    const community = makeBusiness({ id: "c-1", accountId: "acc-c", name: "Comunidad Biz" });

    const commerce = makeBusiness({ id: "m-1", accountId: "acc-m", name: "Comercio Biz" });

    const router = makeRouter({
      businesses: [community, commerce],
      flyers: [makeFlyer("c-1"), makeFlyer("m-1")],
      hours: [makeHour("c-1"), makeHour("m-1")],
      subscriptions: [makeSubscription("acc-m")],
    });

    const caller = router.createCaller({ user: null, origin: "https://api.test" });

    const result = await caller.carousel();

    const names = result.map((item) => item.name);

    expect(names.filter((name) => name === "Comercio Biz")).toHaveLength(3);
    expect(names.filter((name) => name === "Comunidad Biz")).toHaveLength(1);
    expect(result[0]?.imageUrl).toContain("https://api.test/images/media/");
  });

  it("returns the exact stable public URL built from the request origin", async () => {
    const business = makeBusiness({ id: "b-1" });

    const router = makeRouter({
      businesses: [business],
      flyers: [makeFlyer("b-1")],
      hours: [makeHour("b-1")],
      subscriptions: [],
    });

    const caller = router.createCaller({ user: null, origin: "https://api.test" });

    const first = await caller.carousel();

    const second = await caller.carousel();

    expect(first[0]?.imageUrl).toBe(
      "https://api.test/images/media/v1/acc/businesses/b-1/flyer/f.jpg",
    );
    expect(second[0]?.imageUrl).toBe(first[0]?.imageUrl);
  });

  it("keeps a legacy external URL when the flyer has no media id", async () => {
    const business = makeBusiness({ id: "b-1" });

    const router = makeRouter({
      businesses: [business],
      flyers: [{ ...makeFlyer("b-1"), mediaId: null, url: "https://legacy.example/flyer.png" }],
      hours: [makeHour("b-1")],
      subscriptions: [],
    });

    const caller = router.createCaller({ user: null, origin: "https://api.test" });

    expect((await caller.carousel())[0]?.imageUrl).toBe("https://legacy.example/flyer.png");
  });

  it("excludes the item when storage is unconfigured", async () => {
    const business = makeBusiness({ id: "b-1" });

    const router = createCarouselRouter({
      businessRepository: new InMemoryBusinessRepository([business]),
      flyerRepository: new InMemoryFlyerRepository([makeFlyer("b-1")]),
      hourRepository: new InMemoryHourRepository([makeHour("b-1")]),
      subscriptionRepository: new InMemorySubscriptionRepository([]),
      mediaRepository: new InMemoryMediaRepository([makeMedia("b-1")]),
      storage: undefined,
    });

    const caller = router.createCaller({ user: null, origin: "https://api.test" });

    expect(await caller.carousel()).toEqual([]);
  });

  it("excludes the item when the media row is missing", async () => {
    const business = makeBusiness({ id: "b-1" });

    const router = makeRouter({
      businesses: [business],
      flyers: [makeFlyer("b-1")],
      hours: [makeHour("b-1")],
      subscriptions: [],
      media: [],
    });

    const caller = router.createCaller({ user: null, origin: "https://api.test" });

    expect(await caller.carousel()).toEqual([]);
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
