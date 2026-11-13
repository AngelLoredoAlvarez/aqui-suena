import type { MediaKind } from "@aqui-suena/api/domain/media/storage";
import { type CursorPoint, toEpochSeconds } from "@aqui-suena/api/shared/pagination/cursor";
import { paginateOffsetRows } from "@aqui-suena/api/shared/pagination/offset";
import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";

export type Media = {
  id: string;
  ownerId: string;
  kind: MediaKind;
  r2Key: string;
  mime: string;
  size: number;
  createdAt: Date;
};

export type CreateMediaInput = {
  ownerId: string;
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

function toMediaPoint(media: Media): CursorPoint {
  return { createdAt: toEpochSeconds(media.createdAt), id: media.id };
}

export interface MediaRepository {
  listByOwner(input: ListMediaByOwnerInput): Promise<OffsetPage<Media>>;
  getById(id: string): Promise<Media | null>;
  create(input: CreateMediaInput): Promise<Media>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryMediaRepository implements MediaRepository {
  constructor(private readonly items: Media[]) {}

  async listByOwner(input: ListMediaByOwnerInput): Promise<OffsetPage<Media>> {
    const owned = this.items.filter((media) => media.ownerId === input.ownerId);

    return paginateOffsetRows(owned, input, toMediaPoint);
  }

  async getById(id: string): Promise<Media | null> {
    return this.items.find((media) => media.id === id) ?? null;
  }

  async create(input: CreateMediaInput): Promise<Media> {
    const media: Media = {
      id: crypto.randomUUID(),
      ownerId: input.ownerId,
      kind: input.kind,
      r2Key: input.r2Key,
      mime: input.mime,
      size: input.size,
      createdAt: new Date(),
    };

    this.items.push(media);

    return media;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.items.findIndex((media) => media.id === id);

    if (index === -1) return false;

    this.items.splice(index, 1);

    return true;
  }
}
