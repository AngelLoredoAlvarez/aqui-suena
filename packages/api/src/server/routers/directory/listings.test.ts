import { appRouter } from "@aqui-suena/api/server/trpc/router";
import { describe, expect, it } from "vitest";

describe("business router — caps", () => {
  const caller = appRouter.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  it("rejects createProduct on free with UPGRADE_REQUIRED", async () => {
    await expect(
      caller.business.createProduct({
        plan: "community",
        businessId: "biz-1",
        name: "Taco",
        price: 2500,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("UPGRADE_REQUIRED") });
  });

  it("allows createProduct on premium within quota", async () => {
    const result = await caller.business.createProduct({
      plan: "commerce",
      businessId: "biz-1",
      name: "Taco",
      price: 2500,
    });

    expect(result).toMatchObject({ name: "Taco", price: 2500 });
  });

  it("rejects createProduct on premium at cap (100)", async () => {
    await expect(
      caller.business.createProduct({
        plan: "commerce",
        businessId: "biz-1",
        name: "Taco",
        price: 2500,
        currentProductCount: 100,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("UPGRADE_REQUIRED") });
  });

  it("allows logo photo on community within quota (1)", async () => {
    const result = await caller.business.addPhoto({
      plan: "community",
      businessId: "biz-1",
      kind: "logo",
      url: "https://example.com/logo.png",
      currentPhotoCount: 0,
    });

    expect(result).toMatchObject({ kind: "logo" });
  });

  it("rejects 2nd marketing photo on community", async () => {
    await expect(
      caller.business.addPhoto({
        plan: "community",
        businessId: "biz-1",
        kind: "logo",
        url: "https://example.com/logo2.png",
        currentPhotoCount: 1,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("UPGRADE_REQUIRED") });
  });

  it("rejects product photo on community", async () => {
    await expect(
      caller.business.addPhoto({
        plan: "community",
        businessId: "biz-1",
        kind: "product",
        url: "https://example.com/p.png",
        currentPhotoCount: 0,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("UPGRADE_REQUIRED") });
  });

  it("enforces three product photos per product on commerce", async () => {
    const thirdPhoto = await caller.business.addPhoto({
      plan: "commerce",
      businessId: "biz-1",
      kind: "product",
      url: "https://example.com/product-3.png",
      currentProductPhotoCount: 2,
    });

    expect(thirdPhoto).toMatchObject({ kind: "product" });

    await expect(
      caller.business.addPhoto({
        plan: "commerce",
        businessId: "biz-1",
        kind: "product",
        url: "https://example.com/product-4.png",
        currentProductPhotoCount: 3,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("PRODUCT_PHOTO_QUOTA_EXCEEDED") });
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

describe("business router — list and create", () => {
  const caller = appRouter.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  it("caps products per plan in list (commerce)", async () => {
    const listing = {
      name: "X",
      category: "food" as const,
      timezone: "America/Mexico_City",
      delivery: true,
      hours: [] as { day: number; openMinute: number; closeMinute: number }[],
    };

    const products = Array.from({ length: 60 }, (_, i) => ({ name: `p${i}`, price: 100 }));

    const result = await caller.business.list({
      plan: "commerce",
      items: [{ listing, products }],
      now: new Date("2026-10-26T10:00:00-06:00"),
    });

    const firstCommerce = result[0];

    if (!firstCommerce) throw new Error("expected at least one result");

    expect(firstCommerce.products).toHaveLength(50);
    expect(typeof firstCommerce.open).toBe("boolean");
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
      plan: "community",
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
