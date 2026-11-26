import type { MediaKind } from "@aqui-suena/api/domain/media/storage";
import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";

export type Media = {
  id: string;
  ownerId: string;
  businessId: string | null;
  kind: MediaKind;
  r2Key: string;
  mime: string;
  size: number;
  createdAt: Date;
};

export type CreateMediaInput = {
  ownerId: string;
  businessId: string | null;
  kind: MediaKind;
  r2Key: string;
  mime: string;
  size: number;
};

export type ListMediaByOwnerInput = {
  ownerId: string;
  limit: number;
  offset: number;
};

export type ListMediaByBusinessInput = {
  businessId: string;
  limit: number;
  offset: number;
};

export interface MediaRepository {
  listByOwner(input: ListMediaByOwnerInput): Promise<OffsetPage<Media>>;
  listByBusiness(input: ListMediaByBusinessInput): Promise<OffsetPage<Media>>;
  listAllR2Keys(): Promise<string[]>;
  getById(id: string): Promise<Media | null>;
  findByR2Key(r2Key: string): Promise<Media | null>;
  create(input: CreateMediaInput): Promise<Media>;
  delete(id: string): Promise<boolean>;
}
