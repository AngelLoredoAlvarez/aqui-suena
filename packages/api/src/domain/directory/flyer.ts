import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { visibleBusinessIds } from "@aqui-suena/api/domain/directory/visibility";
import { paginateKeyset } from "@aqui-suena/api/shared/pagination/keyset";
import type { CursorPage } from "@aqui-suena/api/shared/pagination/page";

export type Flyer = {
  id: string;
  businessId: string;
  mediaId: string | null;
  url: string | null;
  replacedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ListFlyersInput = {
  limit: number;
  cursor: string | null;
};

function toEpochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export type CreateFlyerInput = {
  businessId: string;
  mediaId: string;
};

export type UpdateFlyerInput = {
  mediaId?: string;
};

export interface FlyerRepository {
  list(input: ListFlyersInput): Promise<CursorPage<Flyer>>;
  getById(id: string): Promise<Flyer | null>;
  findByMediaId(mediaId: string): Promise<Flyer | null>;
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

  async list(input: ListFlyersInput): Promise<CursorPage<Flyer>> {
    let flyers = this.flyers;

    if (this.businesses !== undefined) {
      const visible = await visibleBusinessIds(this.businesses);

      flyers = flyers.filter((flyer) => visible.has(flyer.businessId));
    }

    return paginateKeyset(flyers, input, (flyer) => ({
      createdAt: toEpochSeconds(flyer.createdAt),
      id: flyer.id,
    }));
  }

  async getById(id: string): Promise<Flyer | null> {
    return this.flyers.find((flyer) => flyer.id === id) ?? null;
  }

  async findByMediaId(mediaId: string): Promise<Flyer | null> {
    return this.flyers.find((flyer) => flyer.mediaId === mediaId) ?? null;
  }

  async listByBusiness(businessId: string): Promise<Flyer[]> {
    return this.flyers.filter((flyer) => flyer.businessId === businessId);
  }

  async create(input: CreateFlyerInput): Promise<Flyer> {
    const now = new Date();
    const flyer: Flyer = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      mediaId: input.mediaId,
      url: null,
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
    const replaced = input.mediaId !== undefined;

    const updated: Flyer = {
      ...current,
      mediaId: input.mediaId ?? current.mediaId,
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
