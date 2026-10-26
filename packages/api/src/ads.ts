import * as v from "valibot";

export type AdsCarouselItem = {
  id: string;
  imageUrl: string;
  alt: string;
  href?: string;
};

const adsCarouselItemSchema = v.object({
  id: v.string(),
  imageUrl: v.string(),
  alt: v.string(),
  href: v.optional(v.string()),
});

export const adsCarouselOutput = v.array(adsCarouselItemSchema);

const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  process.env.EXPO_PUBLIC_R2_PUBLIC_URL ||
  "https://pub-placeholder.r2.dev";

const SEED: readonly AdsCarouselItem[] = [
  { id: "ad-1", imageUrl: `${R2_PUBLIC_URL}/ads/flyer-1.png`, alt: "Ad 1" },
  { id: "ad-2", imageUrl: `${R2_PUBLIC_URL}/ads/flyer-2.png`, alt: "Ad 2" },
];

export function getAdsCarousel(): AdsCarouselItem[] {
  return SEED.map((item) => v.parse(adsCarouselItemSchema, item));
}
