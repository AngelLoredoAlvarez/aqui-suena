import type { MediaKind } from "@aqui-suena/api/domain/media/storage";

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

export interface MediaRepository {
  listByOwner(ownerId: string): Promise<Media[]>;
  getById(id: string): Promise<Media | null>;
  create(input: CreateMediaInput): Promise<Media>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryMediaRepository implements MediaRepository {
  constructor(private readonly items: Media[]) {}

  async listByOwner(ownerId: string): Promise<Media[]> {
    return this.items.filter((media) => media.ownerId === ownerId);
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
