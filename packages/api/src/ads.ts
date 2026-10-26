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

const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  process.env.EXPO_PUBLIC_R2_PUBLIC_URL ||
  "https://pub-placeholder.r2.dev";

// Placeholder seed mirroring the design's example businesses so the card is
// verifiable against the design (section 01). Real ads land with the
// ranked `ads.carousel` query over `businesses` + `subscriptions`.
const SEED: readonly AdsCarouselItem[] = [
  {
    id: "ad-1",
    imageUrl: `${R2_PUBLIC_URL}/ads/flyer-1.png`,
    alt: "Flyer del negocio",
    name: "Desayunos Casa Rosa",
    category: "Comida",
    delivery: true,
    opensLabel: "Abre 8:00",
    isOpen: true,
  },
  {
    id: "ad-2",
    imageUrl: `${R2_PUBLIC_URL}/ads/flyer-2.png`,
    alt: "Flyer del negocio",
    name: "Dental Sonrisa",
    category: "Salud",
    delivery: false,
    isOpen: false,
  },
];

export function getAdsCarousel(): AdsCarouselItem[] {
  return SEED.map((item) => v.parse(adsCarouselItemSchema, item));
}
