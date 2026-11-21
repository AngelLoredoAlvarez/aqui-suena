import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";

export const ORPHAN_MEDIA_TTL_MS = 24 * 60 * 60 * 1000;
export const MEDIA_KEY_PREFIX = "media/";

export type SweepMediaOrphansDeps = {
  readonly media: MediaRepository;
  readonly storage: ObjectStorage;
};

export type SweepMediaOrphansResult = {
  readonly deleted: number;
};

export class SweepMediaOrphans {
  constructor(private readonly deps: SweepMediaOrphansDeps) {}

  async execute(now: Date = new Date()): Promise<SweepMediaOrphansResult> {
    const deadline = now.getTime() - ORPHAN_MEDIA_TTL_MS;
    const objects = await this.deps.storage.list(MEDIA_KEY_PREFIX);
    const referenced = new Set(await this.deps.media.listAllR2Keys());

    let deleted = 0;

    for (const object of objects) {
      if (referenced.has(object.key)) continue;

      if (object.lastModified.getTime() > deadline) continue;

      if ((await this.deps.media.findByR2Key(object.key)) !== null) continue;

      await this.deps.storage.delete(object.key);

      deleted += 1;
    }

    return { deleted };
  }
}
