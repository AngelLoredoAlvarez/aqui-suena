import { isRetentionExpired } from "@aqui-suena/api/domain/directory/retention";
import type * as v from "valibot";
import type { businessCategorySchema } from "./contracts/listing";

export type Business = {
  id: string;
  accountId: string;
  name: string;
  category: v.InferOutput<typeof businessCategorySchema>;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  delivery: boolean;
  hiddenAt: Date | null;
  retainedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBusinessInput = {
  accountId: string;
  name: string;
  category: v.InferOutput<typeof businessCategorySchema>;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  delivery: boolean;
};

export type UpdateBusinessInput = {
  name?: string;
  category?: v.InferOutput<typeof businessCategorySchema>;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  timezone?: string;
  delivery?: boolean;
  hiddenAt?: Date | null;
  retainedUntil?: Date | null;
};

export interface BusinessRepository {
  list(): Promise<Business[]>;
  getById(id: string): Promise<Business | null>;
  listByAccount(accountId: string): Promise<Business[]>;
  create(input: CreateBusinessInput): Promise<Business>;
  update(id: string, input: UpdateBusinessInput): Promise<Business | null>;
  delete(id: string): Promise<boolean | null>;
  deleteExpired(now: Date): Promise<number>;
}

export class InMemoryBusinessRepository implements BusinessRepository {
  constructor(private readonly businesses: Business[]) {}

  async list(): Promise<Business[]> {
    return this.businesses;
  }

  async getById(id: string): Promise<Business | null> {
    return this.businesses.find((business) => business.id === id) ?? null;
  }

  async listByAccount(accountId: string): Promise<Business[]> {
    return this.businesses.filter((business) => business.accountId === accountId);
  }

  async create(input: CreateBusinessInput): Promise<Business> {
    const business: Business = {
      id: crypto.randomUUID(),
      accountId: input.accountId,
      name: input.name,
      category: input.category,
      phone: input.phone,
      email: input.email,
      address: input.address,
      timezone: input.timezone,
      delivery: input.delivery,
      hiddenAt: null,
      retainedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.businesses.push(business);

    return business;
  }

  async update(id: string, input: UpdateBusinessInput): Promise<Business | null> {
    const index = this.businesses.findIndex((business) => business.id === id);

    if (index === -1) return null;

    const current = this.businesses[index] as Business;
    const updated: Business = {
      ...current,
      name: input.name ?? current.name,
      category: input.category ?? current.category,
      phone: input.phone !== undefined ? input.phone : current.phone,
      email: input.email !== undefined ? input.email : current.email,
      address: input.address !== undefined ? input.address : current.address,
      timezone: input.timezone ?? current.timezone,
      delivery: input.delivery ?? current.delivery,
      hiddenAt: input.hiddenAt ?? current.hiddenAt,
      retainedUntil: input.retainedUntil ?? current.retainedUntil,
      updatedAt: new Date(),
    };

    this.businesses[index] = updated;

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.businesses.findIndex((business) => business.id === id);

    if (index === -1) return false;

    this.businesses.splice(index, 1);

    return true;
  }

  async deleteExpired(now: Date): Promise<number> {
    let deleted = 0;

    for (let i = this.businesses.length - 1; i >= 0; i--) {
      const business = this.businesses[i] as Business;
      if (business.retainedUntil !== null && isRetentionExpired(business.retainedUntil, now)) {
        this.businesses.splice(i, 1);
        deleted++;
      }
    }

    return deleted;
  }
}
