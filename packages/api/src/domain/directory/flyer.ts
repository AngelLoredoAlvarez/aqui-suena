import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { visibleBusinessIds } from "@aqui-suena/api/domain/directory/visibility";

export type Flyer = {
  id: string;
  businessId: string;
  url: string;
  replacedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateFlyerInput = {
  businessId: string;
  url: string;
};

export type UpdateFlyerInput = {
  url?: string;
};

export interface FlyerRepository {
  list(): Promise<Flyer[]>;
  getById(id: string): Promise<Flyer | null>;
  listByBusiness(businessId: string): Promise<Flyer[]>;
  create(input: CreateFlyerInput): Promise<Flyer>;
  update(id: string, input: UpdateFlyerInput): Promise<Flyer | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryFlyerRepository implements FlyerRepository {
  constructor(
    private readonly flyers: Flyer[],
    private readonly businesses?: BusinessRepository,
  ) {}

  async list(): Promise<Flyer[]> {
    if (this.businesses === undefined) return this.flyers;

    const visible = await visibleBusinessIds(this.businesses);

    return this.flyers.filter((flyer) => visible.has(flyer.businessId));
  }

  async getById(id: string): Promise<Flyer | null> {
    return this.flyers.find((flyer) => flyer.id === id) ?? null;
  }

  async listByBusiness(businessId: string): Promise<Flyer[]> {
    return this.flyers.filter((flyer) => flyer.businessId === businessId);
  }

  async create(input: CreateFlyerInput): Promise<Flyer> {
    const now = new Date();
    const flyer: Flyer = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      url: input.url,
      replacedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.flyers.push(flyer);

    return flyer;
  }

  async update(id: string, input: UpdateFlyerInput): Promise<Flyer | null> {
    const index = this.flyers.findIndex((flyer) => flyer.id === id);

    if (index === -1) return null;

    const current = this.flyers[index] as Flyer;
    const now = new Date();
    const replaced = input.url !== undefined;
    const updated: Flyer = {
      ...current,
      url: input.url ?? current.url,
      replacedAt: replaced ? now : current.replacedAt,
      updatedAt: now,
    };

    this.flyers[index] = updated;

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.flyers.findIndex((flyer) => flyer.id === id);

    if (index === -1) return false;

    this.flyers.splice(index, 1);

    return true;
  }
}
