import { resolvePlan } from "@aqui-suena/api/domain/ads/ad-plan";
import { toCarouselItem } from "@aqui-suena/api/domain/ads/carousel-item";
import type { AdsCarouselItem } from "@aqui-suena/api/domain/ads/contract";
import { type CarouselSlotInput, selectCarouselSlots } from "@aqui-suena/api/domain/ads/ranking";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/model/business";
import type { FlyerRepository } from "@aqui-suena/api/domain/directory/model/flyer";
import type { HourRepository } from "@aqui-suena/api/domain/directory/model/hour";
import { resolvePublicImageUrl } from "@aqui-suena/api/domain/directory/model/media-url";
import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { getEntitlements } from "@aqui-suena/api/domain/plans/entitlements";

export type BusinessCarouselDeps = {
  readonly businessRepository: BusinessRepository;
  readonly flyerRepository: FlyerRepository;
  readonly hourRepository: HourRepository;
  readonly subscriptionRepository: SubscriptionRepository;
  readonly mediaRepository: MediaRepository;
  readonly storage: ObjectStorage | undefined;
};

export async function getBusinessCarousel(
  deps: BusinessCarouselDeps,
  now: Date,
  publicBaseUrl: string,
): Promise<AdsCarouselItem[]> {
  const businesses = await deps.businessRepository.listAll();

  const sponsors: CarouselSlotInput[] = [];
  const itemsById = new Map<string, AdsCarouselItem>();

  for (const business of businesses) {
    const [flyers, hours, subscription] = await Promise.all([
      deps.flyerRepository.listByBusiness(business.id),
      deps.hourRepository.listByBusiness(business.id),
      deps.subscriptionRepository.getActive(business.accountId),
    ]);

    const flyer = flyers[0] ?? null;

    const imageUrl =
      flyer === null
        ? null
        : await resolvePublicImageUrl(deps.mediaRepository, deps.storage, publicBaseUrl, flyer);

    const plan = resolvePlan(subscription);
    const priority = getEntitlements(plan).priority;
    const appearances = getEntitlements(plan).carouselAppearances;
    const eligible = flyer !== null && imageUrl !== null;

    if (eligible && flyer !== null && imageUrl !== null) {
      const item = toCarouselItem(
        {
          business: {
            id: business.id,
            name: business.name,
            category: business.category,
            delivery: business.delivery,
            timezone: business.timezone,
            phone: business.phone,
            address: business.address,
          },
          hours,
        },
        imageUrl,
        now,
      );
      itemsById.set(business.id, item);
    }

    sponsors.push({
      id: business.id,
      priority,
      updatedAt: business.updatedAt.getTime(),
      appearances,
      eligible,
    });
  }

  const slots = selectCarouselSlots(sponsors);

  return slots
    .map((id) => itemsById.get(id))
    .filter((item): item is AdsCarouselItem => item !== undefined);
}
