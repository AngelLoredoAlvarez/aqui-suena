import type {
  CreatePhotoInput,
  ListPhotosByBusinessInput,
  Photo,
  PhotoRepository,
  UpdatePhotoInput,
} from "@aqui-suena/api/domain/directory/model/photo";
import { type CursorPoint, toEpochSeconds } from "@aqui-suena/api/shared/pagination/cursor";
import { paginateOffsetRows } from "@aqui-suena/api/shared/pagination/offset";
import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";

function toPhotoPoint(photo: Photo): CursorPoint {
  return { createdAt: toEpochSeconds(photo.createdAt), id: photo.id };
}

export class InMemoryPhotoRepository implements PhotoRepository {
  constructor(private readonly photos: Photo[]) {}

  async getById(id: string): Promise<Photo | null> {
    return this.photos.find((photo) => photo.id === id) ?? null;
  }

  async findByMediaId(mediaId: string): Promise<Photo | null> {
    return this.photos.find((photo) => photo.mediaId === mediaId) ?? null;
  }

  async listByBusiness(input: ListPhotosByBusinessInput): Promise<OffsetPage<Photo>> {
    const owned = this.photos.filter((photo) => photo.businessId === input.businessId);

    return paginateOffsetRows(owned, input, toPhotoPoint);
  }

  async create(input: CreatePhotoInput): Promise<Photo> {
    const photo: Photo = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      workEntryId: input.workEntryId,
      productId: input.productId,
      kind: input.kind,
      mediaId: input.mediaId,
      url: null,
      createdAt: new Date(),
    };

    this.photos.push(photo);

    return photo;
  }

  async update(id: string, input: UpdatePhotoInput): Promise<Photo | null> {
    const index = this.photos.findIndex((photo) => photo.id === id);

    if (index === -1) return null;

    const current = this.photos[index] as Photo;
    const updated: Photo = {
      ...current,
      workEntryId: input.workEntryId !== undefined ? input.workEntryId : current.workEntryId,
      productId: input.productId !== undefined ? input.productId : current.productId,
      kind: input.kind ?? current.kind,
      mediaId: input.mediaId ?? current.mediaId,
    };

    this.photos[index] = updated;

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.photos.findIndex((photo) => photo.id === id);

    if (index === -1) return false;

    this.photos.splice(index, 1);

    return true;
  }
}
