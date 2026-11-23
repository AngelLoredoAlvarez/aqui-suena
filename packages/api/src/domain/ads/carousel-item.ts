import type { AdsCarouselItem } from "@aqui-suena/api/domain/ads/contract";
import { isOpenNow, nextOpeningTime } from "@aqui-suena/api/domain/directory/contracts/listing";

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
  const isOpen = isOpenNow(source.hours, source.business.timezone, now);

  const opensAt = isOpen
    ? undefined
    : (nextOpeningTime(source.hours, source.business.timezone, now) ?? undefined);

  return {
    id: source.business.id,
    imageUrl: flyerUrl,
    alt: `Flyer de ${source.business.name}`,
    name: source.business.name,
    category: source.business.category,
    delivery: source.business.delivery,
    isOpen,
    opensAt,
  };
}
