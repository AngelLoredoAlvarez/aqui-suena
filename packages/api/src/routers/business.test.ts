import { isOpenNow } from "@aqui-suena/api/listing";

import { appRouter } from "@aqui-suena/api/router";
import { describe, expect, it } from "vitest";

describe("business router — caps", () => {
  const caller = appRouter.createCaller({});

  it("rejects createProduct on free with UPGRADE_REQUIRED", async () => {
    await expect(
      caller.business.createProduct({
        plan: "free",
        businessId: "biz-1",
        name: "Taco",
        price: 2500,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("UPGRADE_REQUIRED") });
  });

  it("allows createProduct on premium within quota", async () => {
    const result = await caller.business.createProduct({
      plan: "premium",
      businessId: "biz-1",
      name: "Taco",
      price: 2500,
    });

    expect(result).toMatchObject({ name: "Taco", price: 2500 });
  });

  it("rejects createProduct on premium at cap (100)", async () => {
    await expect(
      caller.business.createProduct({
        plan: "premium",
        businessId: "biz-1",
        name: "Taco",
        price: 2500,
        currentProductCount: 100,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("UPGRADE_REQUIRED") });
  });

  it("allows flyer photo on free within quota (3)", async () => {
    const result = await caller.business.addPhoto({
      plan: "free",
      businessId: "biz-1",
      kind: "flyer",
      url: "https://example.com/flyer.png",
      currentPhotoCount: 2,
    });

    expect(result).toMatchObject({ kind: "flyer" });
  });

  it("rejects 4th marketing photo on free", async () => {
    await expect(
      caller.business.addPhoto({
        plan: "free",
        businessId: "biz-1",
        kind: "flyer",
        url: "https://example.com/flyer2.png",
        currentPhotoCount: 3,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("UPGRADE_REQUIRED") });
  });

  it("rejects product photo on free", async () => {
    await expect(
      caller.business.addPhoto({
        plan: "free",
        businessId: "biz-1",
        kind: "product",
        url: "https://example.com/p.png",
        currentPhotoCount: 0,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("UPGRADE_REQUIRED") });
  });

  it("derives open in get", async () => {
    const listing = {
      name: "Desayunos Casa Rosa",
      category: "food" as const,
      timezone: "America/Mexico_City",
      delivery: true,
      hours: [{ day: 1, openMinute: 8 * 60, closeMinute: 20 * 60 }],
    };

    const result = await caller.business.get({
      listing,
      now: new Date("2026-10-26T10:00:00-06:00"),
    });

    expect(result.open).toBe(true);
    expect(result).toMatchObject({ name: "Desayunos Casa Rosa" });
  });

  it("derives closed in get", async () => {
    const listing = {
      name: "Desayunos Casa Rosa",
      category: "food" as const,
      timezone: "America/Mexico_City",
      delivery: true,
      hours: [{ day: 1, openMinute: 8 * 60, closeMinute: 20 * 60 }],
    };

    const result = await caller.business.get({
      listing,
      now: new Date("2026-10-26T23:00:00-06:00"),
    });

    expect(result.open).toBe(false);
  });
});

describe("isOpenNow", () => {
  const monday10 = new Date("2026-10-26T10:00:00-06:00");
  const monday23 = new Date("2026-10-26T23:00:00-06:00");

  const hours = [{ day: 1, openMinute: 8 * 60, closeMinute: 20 * 60 }];

  it("returns true when now is within open hours", () => {
    expect(isOpenNow(hours, "America/Mexico_City", monday10)).toBe(true);
  });

  it("returns false when now is outside open hours", () => {
    expect(isOpenNow(hours, "America/Mexico_City", monday23)).toBe(false);
  });

  it("returns false when no hours for that day", () => {
    expect(isOpenNow(hours, "America/Mexico_City", new Date("2026-10-27T10:00:00-06:00"))).toBe(
      false,
    );
  });

  it("returns true during the first half of an overnight range", () => {
    // Saturday 22:30 CST — bar open Sat 22:00 -> Sun 02:00
    const sat2230 = new Date("2026-10-24T22:30:00-06:00");
    const overnight = [{ day: 6, openMinute: 22 * 60, closeMinute: 2 * 60 }];
    expect(isOpenNow(overnight, "America/Mexico_City", sat2230)).toBe(true);
  });

  it("returns true during the second half of an overnight range", () => {
    // Sunday 01:00 CST
    const sun0100 = new Date("2026-10-25T01:00:00-06:00");
    const overnight = [{ day: 6, openMinute: 22 * 60, closeMinute: 2 * 60 }];
    expect(isOpenNow(overnight, "America/Mexico_City", sun0100)).toBe(true);
  });

  it("returns false outside an overnight range", () => {
    // Sunday 03:00 CST
    const sun0300 = new Date("2026-10-25T03:00:00-06:00");
    const overnight = [{ day: 6, openMinute: 22 * 60, closeMinute: 2 * 60 }];
    expect(isOpenNow(overnight, "America/Mexico_City", sun0300)).toBe(false);
  });
});

describe("business router — list and create", () => {
  const caller = appRouter.createCaller({});

  it("caps products per plan in list (premium)", async () => {
    const listing = {
      name: "X",
      category: "food" as const,
      timezone: "America/Mexico_City",
      delivery: true,
      hours: [] as { day: number; openMinute: number; closeMinute: number }[],
    };

    const products = Array.from({ length: 150 }, (_, i) => ({ name: `p${i}`, price: 100 }));

    const result = await caller.business.list({
      plan: "premium",
      items: [{ listing, products }],
      now: new Date("2026-10-26T10:00:00-06:00"),
    });

    const firstPremium = result[0];

    if (!firstPremium) throw new Error("expected at least one result");

    expect(firstPremium.products).toHaveLength(100);
    expect(typeof firstPremium.open).toBe("boolean");
  });

  it("hides all products on free in list", async () => {
    const listing = {
      name: "X",
      category: "food" as const,
      timezone: "America/Mexico_City",
      delivery: true,
      hours: [] as { day: number; openMinute: number; closeMinute: number }[],
    };

    const products = Array.from({ length: 5 }, (_, i) => ({ name: `p${i}`, price: 100 }));

    const result = await caller.business.list({
      plan: "free",
      items: [{ listing, products }],
      now: new Date("2026-10-26T10:00:00-06:00"),
    });

    const firstFree = result[0];

    if (!firstFree) throw new Error("expected at least one result");

    expect(firstFree.products).toHaveLength(0);
  });

  it("create returns id and listing", async () => {
    const listing = {
      name: "X",
      category: "food" as const,
      timezone: "America/Mexico_City",
      delivery: true,
      hours: [] as { day: number; openMinute: number; closeMinute: number }[],
    };

    const result = await caller.business.create(listing);

    expect(result).toMatchObject({ name: "X" });
    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);
  });
});
