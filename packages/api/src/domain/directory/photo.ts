export type PhotoKind = "logo" | "product" | "work";

export type Photo = {
  id: string;
  businessId: string;
  workEntryId: string | null;
  productId: string | null;
  kind: PhotoKind;
  url: string;
  createdAt: Date;
};

export type CreatePhotoInput = {
  businessId: string;
  workEntryId: string | null;
  productId: string | null;
  kind: PhotoKind;
  url: string;
};

export type UpdatePhotoInput = {
  workEntryId?: string | null;
  productId?: string | null;
  kind?: PhotoKind;
  url?: string;
};

export interface PhotoRepository {
  list(): Promise<Photo[]>;
  getById(id: string): Promise<Photo | null>;
  listByBusiness(businessId: string): Promise<Photo[]>;
  create(input: CreatePhotoInput): Promise<Photo>;
  update(id: string, input: UpdatePhotoInput): Promise<Photo | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryPhotoRepository implements PhotoRepository {
  constructor(private readonly photos: Photo[]) {}

  async list(): Promise<Photo[]> {
    return this.photos;
  }

  async getById(id: string): Promise<Photo | null> {
    return this.photos.find((photo) => photo.id === id) ?? null;
  }

  async listByBusiness(businessId: string): Promise<Photo[]> {
    return this.photos.filter((photo) => photo.businessId === businessId);
  }

  async create(input: CreatePhotoInput): Promise<Photo> {
    const photo: Photo = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      workEntryId: input.workEntryId,
      productId: input.productId,
      kind: input.kind,
      url: input.url,
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
      url: input.url ?? current.url,
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
