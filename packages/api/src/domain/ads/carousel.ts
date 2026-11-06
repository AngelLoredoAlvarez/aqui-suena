import type { AdsCarouselItem } from "@aqui-suena/api/ads";
import { isOpenNow } from "@aqui-suena/api/listing";

export type CarouselItemSource = {
  readonly business: {
    readonly id: string;
    readonly name: string;
    readonly category: string;
    readonly delivery: boolean;
    readonly timezone: string;
  };
  readonly hours: readonly {
    readonly day: number;
    readonly openMinute: number;
    readonly closeMinute: number;
  }[];
};

export function toCarouselItem(
  source: CarouselItemSource,
  flyerUrl: string,
  now: Date,
): AdsCarouselItem {
  return {
    id: source.business.id,
    imageUrl: flyerUrl,
    alt: `Flyer de ${source.business.name}`,
    name: source.business.name,
    category: source.business.category,
    delivery: source.business.delivery,
    isOpen: isOpenNow(source.hours, source.business.timezone, now),
  };
}
