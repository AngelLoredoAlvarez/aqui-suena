import * as v from "valibot";
import type { PlanId } from "./entitlements";
import { getEntitlements } from "./entitlements";

// Fixed giro enum shared between API and forms. "other" is the only free-text
// escape hatch (display name via i18n). Extend this list in one place only.
export const BUSINESS_CATEGORIES = [
  "food",
  "health",
  "retail",
  "services",
  "computing",
  "other",
] as const;

export const businessCategorySchema = v.picklist(BUSINESS_CATEGORIES);

export const listingInputSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  category: businessCategorySchema,
  categoryOther: v.optional(v.pipe(v.string(), v.minLength(1))),
  phone: v.optional(
    v.pipe(v.string(), v.regex(/^\+[1-9]\d{1,14}$/, "phone must use E.164 format")),
  ),
  email: v.optional(v.pipe(v.string(), v.email())),
  address: v.optional(v.string()),
  timezone: v.pipe(
    v.string(),
    v.minLength(1),
    v.check((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "invalid IANA timezone"),
  ),
  delivery: v.boolean(),
  hours: v.array(
    v.pipe(
      v.object({
        day: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6)),
        openMinute: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1439)),
        closeMinute: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1439)),
      }),
      v.check((h) => h.closeMinute !== h.openMinute, "open and close must differ"),
    ),
  ),
});

export type ListingInput = v.InferOutput<typeof listingInputSchema>;

export const createProductInputSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  price: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export type CreateProductInput = v.InferOutput<typeof createProductInputSchema>;

export const addPhotoInputSchema = v.object({
  kind: v.picklist(["flyer", "logo", "product"]),
  url: v.pipe(v.string(), v.url()),
});

export type AddPhotoInput = v.InferOutput<typeof addPhotoInputSchema>;

const DAY_MAP: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function isOpenNow(
  hours: { day: number; openMinute: number; closeMinute: number }[],
  timezone: string,
  now: Date,
): boolean {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = DAY_MAP[weekday];
  if (day === undefined) return false;

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const nowMinute = hour * 60 + minute;

  return hours.some((h) => {
    if (h.closeMinute > h.openMinute) {
      // Normal range within a single day.
      return h.day === day && nowMinute >= h.openMinute && nowMinute < h.closeMinute;
    }
    // Overnight range: [openMinute, 1440) on h.day ∪ [0, closeMinute) on the next day.
    if (h.day === day && nowMinute >= h.openMinute) return true;
    if ((h.day + 1) % 7 === day && nowMinute < h.closeMinute) return true;
    return false;
  });
}

export function deriveListingOpen(listing: ListingInput, now: Date): boolean {
  return isOpenNow(listing.hours, listing.timezone, now);
}

export function capProducts<T>(products: readonly T[], plan: PlanId): T[] {
  const cap = getEntitlements(plan).products;

  return products.slice(0, cap);
}
