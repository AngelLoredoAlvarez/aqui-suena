import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { getEntitlements } from "@aqui-suena/api/domain/plans/entitlements";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import * as v from "valibot";

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

export type BusinessCategory = v.InferOutput<typeof businessCategorySchema>;

/** Parses a persisted category; an unknown value is a data-integrity failure. */
export function parseBusinessCategory(value: unknown): BusinessCategory {
  const result = v.safeParse(businessCategorySchema, value);

  if (result.success) return result.output;

  throw new DataIntegrityError("category", value);
}

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
  mediaId: v.pipe(v.string(), v.minLength(1)),
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

function zonedDayAndMinute(timezone: string, now: Date): { day: number; minute: number } | null {
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

  if (day === undefined) return null;

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return { day, minute: hour * 60 + minute };
}

export function isOpenNow(
  hours: readonly { day: number; openMinute: number; closeMinute: number }[],
  timezone: string,
  now: Date,
): boolean {
  const current = zonedDayAndMinute(timezone, now);

  if (current === null) return false;

  return hours.some((h) => {
    if (h.closeMinute > h.openMinute) {
      // Normal range within a single day.
      return (
        h.day === current.day && current.minute >= h.openMinute && current.minute < h.closeMinute
      );
    }
    // Overnight range: [openMinute, 1440) on h.day ∪ [0, closeMinute) on the next day.
    if (h.day === current.day && current.minute >= h.openMinute) return true;

    if ((h.day + 1) % 7 === current.day && current.minute < h.closeMinute) return true;

    return false;
  });
}

/** Formats a minute-of-day as the design shows it: 8:00, 9:30, 18:30. */
export function formatMinute(minute: number): string {
  const normalized = ((minute % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${hour}:${String(mins).padStart(2, "0")}`;
}

/**
 * Next opening time for a closed business, in the business timezone, within
 * the next seven days. Returns null when there are no weekly hours.
 */
export function nextOpeningTime(
  hours: readonly { day: number; openMinute: number; closeMinute: number }[],
  timezone: string,
  now: Date,
): string | null {
  const current = zonedDayAndMinute(timezone, now);

  if (current === null || hours.length === 0) return null;

  let best: number | null = null;

  for (const h of hours) {
    let deltaDays = (h.day - current.day + 7) % 7;

    if (deltaDays === 0 && h.openMinute <= current.minute) {
      deltaDays = 7;
    }

    const candidate = deltaDays * 1440 + h.openMinute;

    if (best === null || candidate < best) {
      best = candidate;
    }
  }

  return best === null ? null : formatMinute(best);
}

export function deriveListingOpen(listing: ListingInput, now: Date): boolean {
  return isOpenNow(listing.hours, listing.timezone, now);
}

export function capProducts<T>(products: readonly T[], plan: PlanId): T[] {
  const cap = getEntitlements(plan).products;

  return products.slice(0, cap);
}
