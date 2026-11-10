import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { MediaValidationError, validateMediaUpload } from "@aqui-suena/api/domain/media/storage";
import { requiredId } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { TRPCError } from "@trpc/server";
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
      // The key must belong to the authenticated account and the declared kind;
      // anything else answers NOT_FOUND so a foreign object never leaks.
      const expectedPrefix = `${input.kind}/${ctx.user.accountId}/`;
      if (!input.key.startsWith(expectedPrefix)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Object not found" });
      }

      const meta = await storage.head(input.key);
      if (meta === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Object not found" });
      }

      if (meta.contentType !== input.contentType) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded content type does not match the declared content type",
        });
      }

      if (meta.size !== input.sizeBytes) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded size does not match the declared size",
        });
      }

      try {
        validateMediaUpload(input.kind, meta.contentType, meta.size);
      } catch (error) {
        if (error instanceof MediaValidationError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }

        throw error;
      }

      // Persist what storage actually holds, never the client's declarations.
      return repository.create({
        ownerId: ctx.user.accountId,
        kind: input.kind,
        r2Key: input.key,
        mime: meta.contentType,
        size: meta.size,
      });
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return repository.listByOwner(ctx.user.accountId);
    }),

    delete: protectedProcedure
      .input(requiredId("Media id is required"))
      .mutation(async ({ input, ctx }) => {
        const media = await repository.getById(input);
        if (media === null || media.ownerId !== ctx.user.accountId) {
          throw new NotFoundError("Media not found");
        }
        await storage.delete(media.r2Key);
        if (!(await repository.delete(input))) {
          throw new NotFoundError("Media not found");
        }
        return true;
      }),
  });
}
