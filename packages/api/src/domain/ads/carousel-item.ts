import type { AdsCarouselItem } from "@aqui-suena/api/domain/ads/contract";
import { isOpenNow, nextOpeningTime } from "@aqui-suena/api/domain/directory/contracts/listing";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";

export type CarouselItemSource = {
  readonly business: {
    readonly id: string;
    readonly name: string;
    readonly category: string;
    readonly delivery: boolean;
    readonly plan: PlanId;
    readonly timezone: string;
    readonly phone: string | null;
    readonly address: string | null;
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
    plan: source.business.plan,
    isOpen,
    opensAt,
    phone: source.business.phone,
    address: source.business.address,
    hours: [...source.hours],
  };
}
