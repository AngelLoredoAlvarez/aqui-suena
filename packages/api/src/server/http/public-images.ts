import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { FlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { parseMediaKey } from "@aqui-suena/api/domain/media/key";
import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import type { Handler } from "hono";

export type PublicImageDeps = {
  readonly media: MediaRepository;
  readonly business: BusinessRepository;
  readonly flyer: FlyerRepository;
  readonly storage: ObjectStorage | undefined;
};

const CACHE_CONTROL = "public, max-age=86400";

export function createPublicImageHandler(deps: PublicImageDeps): Handler {
  return async (context) => {
    const key = context.req.path.replace(/^\/images\//, "");

    const parsed = parseMediaKey(key);

    if (parsed === null || parsed.kind !== "flyer") {
      return context.text("not found", 404, { "cache-control": "no-store" });
    }

    if (deps.storage === undefined) {
      return context.text("media unconfigured", 503, { "cache-control": "no-store" });
    }

    const media = await deps.media.findByR2Key(key);

    if (media === null || media.kind !== "flyer" || media.businessId === null) {
      return context.text("not found", 404, { "cache-control": "no-store" });
    }

    const business = await deps.business.getById(media.businessId);

    if (business === null) {
      return context.text("not found", 404, { "cache-control": "no-store" });
    }

    const flyer = await deps.flyer.findByMediaId(media.id);

    if (flyer === null || flyer.businessId !== media.businessId) {
      return context.text("not found", 404, { "cache-control": "no-store" });
    }

    const object = await deps.storage.readObject(key);

    if (object === null) {
      return context.text("not found", 404, { "cache-control": "no-store" });
    }

    return new Response(object.bytes, {
      headers: {
        "cache-control": CACHE_CONTROL,
        "content-type": media.mime,
        etag: `"${media.id}"`,
        "x-content-type-options": "nosniff",
      },
    });
  };
}
