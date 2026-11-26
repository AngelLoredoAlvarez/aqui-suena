import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";

export type Service = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  basePrice: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateServiceInput = {
  businessId: string;
  name: string;
  description: string | null;
  basePrice: number | null;
};

export type UpdateServiceInput = {
  name?: string;
  description?: string | null;
  basePrice?: number | null;
};

export type ListServicesByBusinessInput = {
  businessId: string;
  limit: number;
  offset: number;
};

export interface ServiceRepository {
  getById(id: string): Promise<Service | null>;
  listByBusiness(input: ListServicesByBusinessInput): Promise<OffsetPage<Service>>;
  create(input: CreateServiceInput): Promise<Service>;
  update(id: string, input: UpdateServiceInput): Promise<Service | null>;
  delete(id: string): Promise<boolean>;
}
