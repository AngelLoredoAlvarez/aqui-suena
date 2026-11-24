import * as v from "valibot";

export type AdsCarouselHour = {
  day: number;
  openMinute: number;
  closeMinute: number;
};

export type AdsCarouselItem = {
  id: string;
  imageUrl: string;
  alt: string;
  name: string;
  category: string;
  delivery: boolean;
  opensAt?: string;
  isOpen: boolean;
  phone?: string | null;
  address?: string | null;
  hours?: AdsCarouselHour[];
  href?: string;
};

const hourSchema = v.object({
  day: v.number(),
  openMinute: v.number(),
  closeMinute: v.number(),
});

const adsCarouselItemSchema = v.object({
  id: v.string(),
  imageUrl: v.string(),
  alt: v.string(),
  name: v.string(),
  category: v.string(),
  delivery: v.boolean(),
  opensAt: v.optional(v.string()),
  isOpen: v.boolean(),
  phone: v.optional(v.nullable(v.string())),
  address: v.optional(v.nullable(v.string())),
  hours: v.optional(v.array(hourSchema)),
  href: v.optional(v.string()),
});

export const adsCarouselOutput = v.array(adsCarouselItemSchema);
