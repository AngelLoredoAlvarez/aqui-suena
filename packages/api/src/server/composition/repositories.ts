import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { FlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { InMemoryFlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import type { HourRepository } from "@aqui-suena/api/domain/directory/hour";
import { InMemoryHourRepository } from "@aqui-suena/api/domain/directory/hour";
import type { PhotoRepository } from "@aqui-suena/api/domain/directory/photo";
import { InMemoryPhotoRepository } from "@aqui-suena/api/domain/directory/photo";
import type { ProductRepository } from "@aqui-suena/api/domain/directory/product";
import { InMemoryProductRepository } from "@aqui-suena/api/domain/directory/product";
import type { ServiceRepository } from "@aqui-suena/api/domain/directory/service";
import { InMemoryServiceRepository } from "@aqui-suena/api/domain/directory/service";
import type { WorkEntryRepository } from "@aqui-suena/api/domain/directory/work-entry";
import { InMemoryWorkEntryRepository } from "@aqui-suena/api/domain/directory/work-entry";
import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import { InMemoryMediaRepository } from "@aqui-suena/api/domain/media/media";
import { D1SubscriptionRepository } from "@aqui-suena/api/infrastructure/billing/subscriptions/d1-subscription-repository";
import { D1BusinessRepository } from "@aqui-suena/api/infrastructure/directory/d1-business-repository";
import { D1FlyerRepository } from "@aqui-suena/api/infrastructure/directory/d1-flyer-repository";
import { D1HourRepository } from "@aqui-suena/api/infrastructure/directory/d1-hour-repository";
import { D1PhotoRepository } from "@aqui-suena/api/infrastructure/directory/d1-photo-repository";
import { D1ProductRepository } from "@aqui-suena/api/infrastructure/directory/d1-product-repository";
import { D1ServiceRepository } from "@aqui-suena/api/infrastructure/directory/d1-service-repository";
import { D1WorkEntryRepository } from "@aqui-suena/api/infrastructure/directory/d1-work-entry-repository";
import { D1MediaRepository } from "@aqui-suena/api/infrastructure/media/d1-media-repository";

export interface DirectoryRepositories {
  business: BusinessRepository;
  service: ServiceRepository;
  product: ProductRepository;
  photo: PhotoRepository;
  workEntry: WorkEntryRepository;
  flyer: FlyerRepository;
  hour: HourRepository;
  subscription: SubscriptionRepository;
  media: MediaRepository;
}

/**
 * In-memory composition used by tests and the local Node process when no
 * driver is injected.
 */
export function createInMemoryRepositories(): DirectoryRepositories {
  return {
    business: new InMemoryBusinessRepository([]),
    service: new InMemoryServiceRepository([]),
    product: new InMemoryProductRepository([]),
    photo: new InMemoryPhotoRepository([]),
    workEntry: new InMemoryWorkEntryRepository([]),
    flyer: new InMemoryFlyerRepository([]),
    hour: new InMemoryHourRepository([]),
    subscription: new InMemorySubscriptionRepository([]),
    media: new InMemoryMediaRepository([]),
  };
}

/**
 * D1-backed composition used by the Cloudflare Worker.
 * Adding a repository means editing this file only: every entry point shares it.
 */
export function createD1Repositories(db: D1Database): DirectoryRepositories {
  return {
    business: new D1BusinessRepository(db),
    service: new D1ServiceRepository(db),
    product: new D1ProductRepository(db),
    photo: new D1PhotoRepository(db),
    workEntry: new D1WorkEntryRepository(db),
    flyer: new D1FlyerRepository(db),
    hour: new D1HourRepository(db),
    subscription: new D1SubscriptionRepository(db),
    media: new D1MediaRepository(db),
  };
}

export const defaultDirectoryRepositories = createInMemoryRepositories();
