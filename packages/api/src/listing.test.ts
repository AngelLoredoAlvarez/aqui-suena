import { parse } from "valibot";
import { describe, expect, it } from "vitest";

import {
  addPhotoInputSchema,
  businessCategorySchema,
  capProducts,
  createProductInputSchema,
  deriveListingOpen,
  isOpenNow,
  listingInputSchema,
} from "./listing";

describe("businessCategorySchema", () => {
  it("accepts a known category", () => {
    expect(parse(businessCategorySchema, "food")).toBe("food");
  });

  it("rejects an unknown category", () => {
    expect(() => parse(businessCategorySchema, "random")).toThrow();
  });
});

describe("listingInputSchema", () => {
  const valid = {
    name: "Desayunos Casa Rosa",
    category: "food",
    timezone: "America/Mexico_City",
    delivery: true,
    hours: [{ day: 1, openMinute: 480, closeMinute: 900 }],
  };

  it("accepts a valid listing", () => {
    expect(parse(listingInputSchema, valid)).toEqual(valid);
  });

  it("rejects empty name", () => {
    expect(() => parse(listingInputSchema, { ...valid, name: "" })).toThrow();
  });

  it("rejects invalid timezone (empty)", () => {
    expect(() => parse(listingInputSchema, { ...valid, timezone: "" })).toThrow();
  });

  it("rejects an invalid IANA timezone", () => {
    expect(() => parse(listingInputSchema, { ...valid, timezone: "Foo/Bar" })).toThrow();
  });

  it("rejects day out of range", () => {
    expect(() =>
      parse(listingInputSchema, { ...valid, hours: [{ day: 7, openMinute: 0, closeMinute: 60 }] }),
    ).toThrow();
  });

  it("rejects minute out of range", () => {
    expect(() =>
      parse(listingInputSchema, {
        ...valid,
        hours: [{ day: 1, openMinute: 0, closeMinute: 1500 }],
      }),
    ).toThrow();
  });
});

describe("createProductInputSchema", () => {
  it("accepts a valid product", () => {
    expect(parse(createProductInputSchema, { name: "Taco", price: 2500 })).toEqual({
      name: "Taco",
      price: 2500,
    });
  });

  it("rejects non-positive price", () => {
    expect(() => parse(createProductInputSchema, { name: "Taco", price: 0 })).toThrow();
    expect(() => parse(createProductInputSchema, { name: "Taco", price: -1 })).toThrow();
  });

  it("rejects non-integer price", () => {
    expect(() => parse(createProductInputSchema, { name: "Taco", price: 25.5 })).toThrow();
  });
});

describe("addPhotoInputSchema", () => {
  it("accepts a valid photo", () => {
    expect(parse(addPhotoInputSchema, { kind: "flyer", url: "https://example.com/f.png" })).toEqual(
      {
        kind: "flyer",
        url: "https://example.com/f.png",
      },
    );
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      parse(addPhotoInputSchema, { kind: "banner", url: "https://example.com/f.png" }),
    ).toThrow();
  });

  it("rejects an invalid url", () => {
    expect(() => parse(addPhotoInputSchema, { kind: "flyer", url: "not-a-url" })).toThrow();
  });
});

describe("listingInputSchema — additional guards", () => {
  const valid = {
    name: "Desayunos Casa Rosa",
    category: "food" as const,
    timezone: "America/Mexico_City",
    delivery: true,
    hours: [{ day: 1, openMinute: 480, closeMinute: 900 }],
  };

  it("rejects an empty hours range (open === close)", () => {
    expect(() =>
      parse(listingInputSchema, {
        ...valid,
        hours: [{ day: 1, openMinute: 480, closeMinute: 480 }],
      }),
    ).toThrow();
  });

  it("rejects an invalid email", () => {
    expect(() => parse(listingInputSchema, { ...valid, email: "not-an-email" })).toThrow();
  });

  it("accepts a valid email", () => {
    expect(parse(listingInputSchema, { ...valid, email: "a@b.com" })).toMatchObject({
      email: "a@b.com",
    });
  });

  it("accepts an E.164 phone", () => {
    expect(parse(listingInputSchema, { ...valid, phone: "+5215512345678" })).toMatchObject({
      phone: "+5215512345678",
    });
  });

  it.each([
    "",
    "5512345678",
    "+52 55 1234 5678",
    "+05215512345678",
    "+1234567890123456",
    "not-a-phone",
  ])("rejects non-E.164 phone %s", (phone) => {
    expect(() => parse(listingInputSchema, { ...valid, phone })).toThrow();
  });
});

describe("listingInputSchema — categoryOther", () => {
  const valid = {
    name: "Desayunos Casa Rosa",
    category: "food" as const,
    timezone: "America/Mexico_City",
    delivery: true,
    hours: [{ day: 1, openMinute: 480, closeMinute: 900 }],
  };

  it("keeps categoryOther when provided", () => {
    const result = parse(listingInputSchema, {
      ...valid,
      category: "other",
      categoryOther: "Miscelánea",
    });

    expect(result).toMatchObject({ category: "other", categoryOther: "Miscelánea" });
  });

  it("allows omitting categoryOther", () => {
    const result = parse(listingInputSchema, { ...valid, category: "food" });

    expect(result.categoryOther).toBeUndefined();
  });

  it("rejects an empty categoryOther", () => {
    expect(() =>
      parse(listingInputSchema, { ...valid, category: "other", categoryOther: "" }),
    ).toThrow();
  });
});

describe("deriveListingOpen", () => {
  const listing = {
    name: "Desayunos Casa Rosa",
    category: "food" as const,
    timezone: "America/Mexico_City",
    delivery: true,
    hours: [{ day: 1, openMinute: 8 * 60, closeMinute: 20 * 60 }],
  };

  it("returns true when now is within open hours", () => {
    expect(deriveListingOpen(listing, new Date("2026-10-26T10:00:00-06:00"))).toBe(true);
  });

  it("returns false when now is outside open hours", () => {
    expect(deriveListingOpen(listing, new Date("2026-10-26T23:00:00-06:00"))).toBe(false);
  });
});

describe("capProducts", () => {
  const products = Array.from({ length: 150 }, (_, i) => ({ name: `p${i}`, price: 100 }));

  it("caps at plan limit (premium = 100)", () => {
    expect(capProducts(products, "premium")).toHaveLength(100);
  });

  it("returns empty for free (cap = 0)", () => {
    expect(capProducts(products, "free")).toHaveLength(0);
  });

  it("does not mutate the input (hidden, not deleted)", () => {
    const input = [...products];

    capProducts(input, "premium");

    expect(input).toHaveLength(150);
  });

  it("returns a new array (no aliasing)", () => {
    const result = capProducts(products, "premium");

    expect(result).not.toBe(products);
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
