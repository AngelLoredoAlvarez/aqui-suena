import type { AdsCarouselItem } from "@aqui-suena/api/ads";
import { getEntitlements } from "@aqui-suena/api/domain/billing/catalog/entitlements";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscriptions";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { FlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import type { HourRepository } from "@aqui-suena/api/domain/directory/hour";
import { resolvePlan } from "./ad-plan";
import { toCarouselItem } from "./carousel";
import { type CarouselSlotInput, selectCarouselSlots } from "./ranking";

export type BusinessCarouselDeps = {
  readonly businessRepository: BusinessRepository;
  readonly flyerRepository: FlyerRepository;
  readonly hourRepository: HourRepository;
  readonly subscriptionRepository: SubscriptionRepository;
};

export async function getBusinessCarousel(
  deps: BusinessCarouselDeps,
  now: Date,
): Promise<AdsCarouselItem[]> {
  const businesses = await deps.businessRepository.list();

  const sponsors: CarouselSlotInput[] = [];
  const itemsById = new Map<string, AdsCarouselItem>();

  for (const business of businesses) {
    const [flyers, hours, subscription] = await Promise.all([
      deps.flyerRepository.listByBusiness(business.id),
      deps.hourRepository.listByBusiness(business.id),
      deps.subscriptionRepository.getActive(business.accountId),
    ]);

    const flyer = flyers[0] ?? null;
    const plan = resolvePlan(subscription);
    const priority = getEntitlements(plan).priority;
    const appearances = getEntitlements(plan).carouselAppearances;
    const eligible = flyer !== null;

    if (eligible && flyer) {
      const item = toCarouselItem(
        {
          business: {
            id: business.id,
            name: business.name,
            category: business.category,
            delivery: business.delivery,
            timezone: business.timezone,
          },
          hours,
        },
        flyer.url,
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
