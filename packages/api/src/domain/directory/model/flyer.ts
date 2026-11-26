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
