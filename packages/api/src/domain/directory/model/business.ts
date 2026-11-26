import type { businessCategorySchema } from "@aqui-suena/api/domain/directory/contracts/listing";
import type { CursorPage, OffsetPage } from "@aqui-suena/api/shared/pagination/page";
import type * as v from "valibot";

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

export type ListBusinessesInput = {
  limit: number;
  cursor: string | null;
};

export type ListBusinessesByAccountInput = {
  accountId: string;
  limit: number;
  offset: number;
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
  list(input: ListBusinessesInput): Promise<CursorPage<Business>>;
  listAll(): Promise<Business[]>;
  listByAccount(input: ListBusinessesByAccountInput): Promise<OffsetPage<Business>>;
  listAllByAccount(accountId: string): Promise<Business[]>;
  getById(id: string): Promise<Business | null>;
  getByIdForOwner(id: string): Promise<Business | null>;
  create(input: CreateBusinessInput): Promise<Business>;
  update(id: string, input: UpdateBusinessInput): Promise<Business | null>;
  delete(id: string): Promise<boolean | null>;
  deleteByAccount(accountId: string): Promise<number>;
  listExpired(now: Date): Promise<Business[]>;
}
