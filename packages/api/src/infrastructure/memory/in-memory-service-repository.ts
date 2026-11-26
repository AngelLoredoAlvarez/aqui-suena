import type {
  CreateServiceInput,
  ListServicesByBusinessInput,
  Service,
  ServiceRepository,
  UpdateServiceInput,
} from "@aqui-suena/api/domain/directory/model/service";
import { type CursorPoint, toEpochSeconds } from "@aqui-suena/api/shared/pagination/cursor";
import { paginateOffsetRows } from "@aqui-suena/api/shared/pagination/offset";
import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";

function toServicePoint(service: Service): CursorPoint {
  return { createdAt: toEpochSeconds(service.createdAt), id: service.id };
}

export class InMemoryServiceRepository implements ServiceRepository {
  constructor(private readonly services: Service[]) {}

  async getById(id: string): Promise<Service | null> {
    return this.services.find((service) => service.id === id) ?? null;
  }

  async listByBusiness(input: ListServicesByBusinessInput): Promise<OffsetPage<Service>> {
    const owned = this.services.filter((service) => service.businessId === input.businessId);

    return paginateOffsetRows(owned, input, toServicePoint);
  }

  async create(input: CreateServiceInput): Promise<Service> {
    const service: Service = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      name: input.name,
      description: input.description,
      basePrice: input.basePrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.services.push(service);

    return service;
  }

  async update(id: string, input: UpdateServiceInput): Promise<Service | null> {
    const index = this.services.findIndex((service) => service.id === id);

    if (index === -1) return null;

    const current = this.services[index] as Service;
    const updated: Service = {
      ...current,
      name: input.name ?? current.name,
      description: input.description !== undefined ? input.description : current.description,
      basePrice: input.basePrice !== undefined ? input.basePrice : current.basePrice,
      updatedAt: new Date(),
    };

    this.services[index] = updated;

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.services.findIndex((service) => service.id === id);

    if (index === -1) return false;

    this.services.splice(index, 1);

    return true;
  }
}
