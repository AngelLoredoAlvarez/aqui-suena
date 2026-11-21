import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { MediaKind } from "@aqui-suena/api/domain/media/media-kind";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";

export type AttachMediaInput = {
  readonly media: MediaRepository;
  readonly accountId: string;
  readonly businessId: string;
  readonly mediaId: string;
  readonly kind: MediaKind;
};

export async function assertAttachableMedia(input: AttachMediaInput): Promise<void> {
  const row = await input.media.getById(input.mediaId);

  if (row === null || row.ownerId !== input.accountId || row.businessId !== input.businessId) {
    throw new NotFoundError("Media not found");
  }

  if (row.kind !== input.kind) {
    throw new ValidationError(`Attach a ${input.kind} media row`);
  }
}

export async function deleteMediaAttachment(
  media: MediaRepository,
  storage: ObjectStorage | undefined,
  mediaId: string | null,
): Promise<void> {
  if (mediaId === null) return;

  const row = await media.getById(mediaId);

  if (row === null) return;

  if (storage !== undefined) {
    await storage.delete(row.r2Key);
  }

  await media.delete(row.id);
}
