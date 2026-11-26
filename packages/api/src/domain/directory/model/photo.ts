import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";

export type PhotoKind = "logo" | "product" | "work";

export type Photo = {
  id: string;
  businessId: string;
  workEntryId: string | null;
  productId: string | null;
  kind: PhotoKind;
  mediaId: string | null;
  url: string | null;
  createdAt: Date;
};

export type CreatePhotoInput = {
  businessId: string;
  workEntryId: string | null;
  productId: string | null;
  kind: PhotoKind;
  mediaId: string;
};

export type UpdatePhotoInput = {
  workEntryId?: string | null;
  productId?: string | null;
  kind?: PhotoKind;
  mediaId?: string;
};

export type ListPhotosByBusinessInput = {
  businessId: string;
  limit: number;
  offset: number;
};

export interface PhotoRepository {
  getById(id: string): Promise<Photo | null>;
  findByMediaId(mediaId: string): Promise<Photo | null>;
  listByBusiness(input: ListPhotosByBusinessInput): Promise<OffsetPage<Photo>>;
  create(input: CreatePhotoInput): Promise<Photo>;
  update(id: string, input: UpdatePhotoInput): Promise<Photo | null>;
  delete(id: string): Promise<boolean>;
}
