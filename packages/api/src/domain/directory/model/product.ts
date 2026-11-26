import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";

export type Product = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  createdAt: Date;
};

export type CreateProductInput = {
  businessId: string;
  name: string;
  description: string | null;
  price: number;
};

export type UpdateProductInput = {
  name?: string;
  description?: string | null;
  price?: number;
};

export type ListProductsByBusinessInput = {
  businessId: string;
  limit: number;
  offset: number;
};

export interface ProductRepository {
  getById(id: string): Promise<Product | null>;
  listByBusiness(input: ListProductsByBusinessInput): Promise<OffsetPage<Product>>;
  listAllByBusiness(businessId: string): Promise<Product[]>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}
