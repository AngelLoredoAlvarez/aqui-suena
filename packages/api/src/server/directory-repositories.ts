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

export interface DirectoryRepositories {
  business: BusinessRepository;
  service: ServiceRepository;
  product: ProductRepository;
  photo: PhotoRepository;
  workEntry: WorkEntryRepository;
  flyer: FlyerRepository;
  hour: HourRepository;
}

export function createDefaultDirectoryRepositories(): DirectoryRepositories {
  return {
    business: new InMemoryBusinessRepository([]),
    service: new InMemoryServiceRepository([]),
    product: new InMemoryProductRepository([]),
    photo: new InMemoryPhotoRepository([]),
    workEntry: new InMemoryWorkEntryRepository([]),
    flyer: new InMemoryFlyerRepository([]),
    hour: new InMemoryHourRepository([]),
  };
}
