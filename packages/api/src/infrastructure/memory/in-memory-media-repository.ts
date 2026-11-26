import type {
  CreateMediaInput,
  ListMediaByBusinessInput,
  ListMediaByOwnerInput,
  Media,
  MediaRepository,
} from "@aqui-suena/api/domain/media/media";
import { type CursorPoint, toEpochSeconds } from "@aqui-suena/api/shared/pagination/cursor";
import { paginateOffsetRows } from "@aqui-suena/api/shared/pagination/offset";
import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";

function toMediaPoint(media: Media): CursorPoint {
  return { createdAt: toEpochSeconds(media.createdAt), id: media.id };
}

export class InMemoryMediaRepository implements MediaRepository {
  constructor(private readonly items: Media[]) {}

  async listByOwner(input: ListMediaByOwnerInput): Promise<OffsetPage<Media>> {
    const owned = this.items.filter((media) => media.ownerId === input.ownerId);

    return paginateOffsetRows(owned, input, toMediaPoint);
  }

  async listByBusiness(input: ListMediaByBusinessInput): Promise<OffsetPage<Media>> {
    const owned = this.items.filter((media) => media.businessId === input.businessId);

    return paginateOffsetRows(owned, input, toMediaPoint);
  }

  async listAllR2Keys(): Promise<string[]> {
    return this.items.map((media) => media.r2Key);
  }

  async getById(id: string): Promise<Media | null> {
    return this.items.find((media) => media.id === id) ?? null;
  }

  async findByR2Key(r2Key: string): Promise<Media | null> {
    return this.items.find((media) => media.r2Key === r2Key) ?? null;
  }

  async create(input: CreateMediaInput): Promise<Media> {
    const media: Media = {
      id: crypto.randomUUID(),
      ownerId: input.ownerId,
      businessId: input.businessId,
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
