import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import * as v from "valibot";

const mediaKind = v.picklist(["product-photo", "flyer", "spot-audio", "avatar"]);

const presignInput = v.object({
  kind: mediaKind,
  contentType: v.string(),
  sizeBytes: v.number(),
});

const confirmInput = v.object({
  key: v.pipe(v.string(), v.minLength(1)),
  kind: mediaKind,
  contentType: v.string(),
  sizeBytes: v.number(),
});

export function createMediaRouter(repository: MediaRepository, storage: ObjectStorage) {
  return router({
    presignUpload: protectedProcedure.input(presignInput).mutation(async ({ input, ctx }) => {
      const { key, uploadUrl } = await storage.presignUpload({
        kind: input.kind,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        ownerId: ctx.user.accountId,
      });
      return { key, uploadUrl };
    }),

    confirm: protectedProcedure.input(confirmInput).mutation(async ({ input, ctx }) => {
      const meta = await storage.head(input.key);
      if (meta === null) {
        throw new Error("Object not found in storage");
      }
      return repository.create({
        ownerId: ctx.user.accountId,
        kind: input.kind,
        r2Key: input.key,
        mime: input.contentType,
        size: input.sizeBytes,
      });
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return repository.listByOwner(ctx.user.accountId);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0) {
          throw new Error("Media id is required");
        }
        return value;
      })
      .mutation(async ({ input, ctx }) => {
        const media = await repository.getById(input);
        if (media === null || media.ownerId !== ctx.user.accountId) {
          return false;
        }
        await storage.delete(media.r2Key);
        return repository.delete(input);
      }),
  });
}
