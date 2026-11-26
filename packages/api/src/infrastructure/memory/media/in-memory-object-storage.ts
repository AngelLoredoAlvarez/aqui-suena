import { buildMediaKey } from "@aqui-suena/api/domain/media/key";
import { validateMediaUpload } from "@aqui-suena/api/domain/media/media-kind";
import type {
  ObjectMetadata,
  ObjectStorage,
  PresignUploadInput,
  PresignUploadResult,
  StoredObject,
  StoredObjectContent,
} from "@aqui-suena/api/domain/media/storage";

function defaultBody(contentType: string): Uint8Array {
  switch (contentType) {
    case "image/jpeg":
      return new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9,
      ]);
    case "image/png":
      return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    case "audio/mpeg": {
      const frame = new Uint8Array(417);
      frame.set([0xff, 0xfb, 0x90, 0x00]);
      return frame;
    }
    default:
      return new Uint8Array();
  }
}

export class InMemoryObjectStorage implements ObjectStorage {
  readonly presigned: PresignUploadInput[] = [];
  private readonly stored = new Map<string, ObjectMetadata>();
  private readonly storedAt = new Map<string, Date>();
  private readonly bodies = new Map<string, Uint8Array>();

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    validateMediaUpload(input.kind, input.contentType, input.sizeBytes);

    const key = buildMediaKey({
      accountId: input.ownerId,
      businessId: input.businessId,
      kind: input.kind,
      contentType: input.contentType,
    });

    const uploadUrl = `https://fake.r2/${key}`;

    this.presigned.push(input);

    return { key, uploadUrl };
  }

  async head(key: string): Promise<ObjectMetadata | null> {
    return this.stored.get(key) ?? null;
  }

  async readObject(key: string): Promise<StoredObjectContent | null> {
    const meta = this.stored.get(key);

    if (meta === undefined) {
      return null;
    }

    return { ...meta, bytes: this.bodies.get(key) ?? new Uint8Array() };
  }

  async signedUrl(key: string): Promise<string> {
    return `https://fake.r2/${key}?signed=1`;
  }

  async list(prefix: string): Promise<StoredObject[]> {
    return [...this.stored.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key]) => ({ key, lastModified: this.storedAt.get(key) ?? new Date(0) }));
  }

  async delete(key: string): Promise<void> {
    this.stored.delete(key);
    this.storedAt.delete(key);
    this.bodies.delete(key);
  }

  /** Simulates a client that finished uploading to `key`. */
  confirm(
    key: string,
    size: number,
    contentType: string,
    storedAt: Date = new Date(),
    body: Uint8Array = defaultBody(contentType),
  ): void {
    this.stored.set(key, { key, size, contentType });
    this.storedAt.set(key, storedAt);
    this.bodies.set(key, body);
  }
}
