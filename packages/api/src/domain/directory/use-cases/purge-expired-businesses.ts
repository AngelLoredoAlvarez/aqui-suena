import type { BusinessRepository } from "@aqui-suena/api/domain/directory/model/business";
import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";

const MEDIA_PAGE_SIZE = 100;

export type PurgeExpiredBusinessesDeps = {
  readonly businesses: BusinessRepository;
  readonly media: MediaRepository;
  readonly storage: ObjectStorage;
};

export type PurgeExpiredBusinessesResult = {
  readonly businesses: number;
  readonly media: number;
};

export class PurgeExpiredBusinesses {
  constructor(private readonly deps: PurgeExpiredBusinessesDeps) {}

  async execute(now: Date = new Date()): Promise<PurgeExpiredBusinessesResult> {
    const expired = await this.deps.businesses.listExpired(now);
    let media = 0;

    for (const business of expired) {
      media += await this.purgeMedia(business.id);
      await this.deps.businesses.delete(business.id);
    }

    return { businesses: expired.length, media };
  }

  private async purgeMedia(businessId: string): Promise<number> {
    let deleted = 0;

    for (;;) {
      const page = await this.deps.media.listByBusiness({
        businessId,
        limit: MEDIA_PAGE_SIZE,
        offset: 0,
      });

      if (page.items.length === 0) {
        return deleted;
      }

      for (const item of page.items) {
        await this.deps.storage.delete(item.r2Key);

        if (!(await this.deps.media.delete(item.id))) {
          throw new Error(`Media row vanished during purge: ${item.id}`);
        }

        deleted += 1;
      }
    }
  }
}
