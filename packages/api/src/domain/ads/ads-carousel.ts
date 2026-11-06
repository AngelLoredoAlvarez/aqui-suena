import * as v from "valibot";

export type AdsCarouselItem = {
  id: string;
  imageUrl: string;
  alt: string;
  name: string;
  category: string;
  delivery: boolean;
  opensLabel?: string;
  isOpen: boolean;
  href?: string;
};

const adsCarouselItemSchema = v.object({
  id: v.string(),
  imageUrl: v.string(),
  alt: v.string(),
  name: v.string(),
  category: v.string(),
  delivery: v.boolean(),
  opensLabel: v.optional(v.string()),
  isOpen: v.boolean(),
  href: v.optional(v.string()),
});

export const adsCarouselOutput = v.array(adsCarouselItemSchema);
