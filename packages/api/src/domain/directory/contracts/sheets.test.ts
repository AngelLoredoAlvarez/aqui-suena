import { describe, expect, it } from "vitest";

import { resolveSheet, type SheetSource } from "./sheets";

const baseSource: SheetSource = {
  business: {
    id: "b1",
    name: "Casa Rosa",
    category: "food",
    phone: "+521234567890",
    email: null,
    address: "Calle 1",
    timezone: "America/Mexico_City",
    delivery: true,
  },
  isOpen: true,
  flyerUrl: "https://r2/flyer.png",
  specialties: ["desayunos"],
  coverageArea: "Centro",
  services: [{ name: "Desayuno", basePrice: 50 }],
  workEntries: [{ title: "Trabajo 1", description: null, photos: ["p1.png"] }],
  urgencyBadge: true,
  diagnosticRates: true,
  products: [{ id: "prod1", name: "Taco", price: 20, photos: ["taco.png"] }],
  featuredProductId: "prod1",
  socialLinks: [{ type: "instagram", url: "https://ig.com/x" }],
  paymentMethods: ["cash", "card"],
};

describe("resolveSheet", () => {
  it("community plan returns only base fields plus flyer, no products/services", () => {
    const sheet = resolveSheet("community", baseSource);

    expect(sheet.plan).toBe("community");
    expect(sheet.name).toBe("Casa Rosa");
    expect(sheet.flyerUrl).toBe("https://r2/flyer.png");
    expect(sheet.isOpen).toBe(true);
    expect("services" in sheet).toBe(false);
    expect("products" in sheet).toBe(false);
    expect("workEntries" in sheet).toBe(false);
  });

  it("trades plan adds services, work entries, urgency and diagnostic rates", () => {
    const sheet = resolveSheet("trades", baseSource);

    expect(sheet.plan).toBe("trades");
    expect("services" in sheet).toBe(true);
    expect("workEntries" in sheet).toBe(true);
    expect("urgencyBadge" in sheet).toBe(true);
    expect("diagnosticRates" in sheet).toBe(true);
    expect("products" in sheet).toBe(false);
  });

  it("commerce plan adds catalog products, featured, social links and payment methods", () => {
    const sheet = resolveSheet("commerce", baseSource);

    expect(sheet.plan).toBe("commerce");
    expect("products" in sheet).toBe(true);
    expect("featuredProductId" in sheet).toBe(true);
    expect("socialLinks" in sheet).toBe(true);
    expect("paymentMethods" in sheet).toBe(true);

    if (sheet.plan !== "commerce") throw new Error("expected commerce sheet");

    expect(sheet.products).toHaveLength(1);
  });

  it("caps products to the plan quota for commerce", () => {
    const manyProducts = Array.from({ length: 60 }, (_, i) => ({
      id: `p${i}`,
      name: `Prod ${i}`,
      price: 10,
      photos: [],
    }));
    const source: SheetSource = { ...baseSource, products: manyProducts };
    const sheet = resolveSheet("commerce", source);

    if (sheet.plan !== "commerce") throw new Error("expected commerce sheet");

    expect(sheet.products).toHaveLength(50);
  });

  it("does not mutate the source", () => {
    const before = baseSource.products.length;

    resolveSheet("commerce", baseSource);

    expect(baseSource.products.length).toBe(before);
  });
});
