import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";

export type MediaUrlSource = {
  readonly mediaId: string | null;
  readonly url: string | null;
};

export async function resolveMediaUrl(
  media: MediaRepository,
  storage: ObjectStorage | undefined,
  source: MediaUrlSource,
): Promise<string | null> {
  if (source.mediaId === null) {
    return source.url;
  }

  if (storage === undefined) {
    return null;
  }

  const row = await media.getById(source.mediaId);

  return row === null ? null : storage.signedUrl(row.r2Key);
}

export function buildPublicImageUrl(baseUrl: string, r2Key: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/images/${r2Key}`;
}

export async function resolvePublicImageUrl(
  media: MediaRepository,
  storage: ObjectStorage | undefined,
  baseUrl: string,
  source: MediaUrlSource,
): Promise<string | null> {
  if (source.mediaId === null) {
    return source.url;
  }

  if (storage === undefined) {
    return null;
  }

  const row = await media.getById(source.mediaId);

  return row === null ? null : buildPublicImageUrl(baseUrl, row.r2Key);
}
