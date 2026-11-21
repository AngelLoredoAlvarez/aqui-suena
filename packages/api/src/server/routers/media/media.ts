import { resolvePlan } from "@aqui-suena/api/domain/ads/ad-plan";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { assertMediaContent } from "@aqui-suena/api/domain/media/content-validation";
import { assertCanUploadMedia } from "@aqui-suena/api/domain/media/entitlement";
import {
  mediaExtensionFor,
  parseMediaKey,
  resolveMediaScope,
} from "@aqui-suena/api/domain/media/key";
import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { MediaValidationError, validateMediaUpload } from "@aqui-suena/api/domain/media/storage";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { idInput } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { offsetInputSchema } from "@aqui-suena/api/shared/pagination/input";
import { TRPCError } from "@trpc/server";
import * as v from "valibot";

const mediaKind = v.picklist(["product-photo", "flyer", "spot-audio", "avatar"]);

const presignInput = v.object({
  kind: mediaKind,
  contentType: v.string(),
  sizeBytes: v.number(),
  businessId: v.optional(v.pipe(v.string(), v.minLength(1))),
});

const confirmInput = v.object({
  key: v.pipe(v.string(), v.minLength(1)),
  kind: mediaKind,
  contentType: v.string(),
  sizeBytes: v.number(),
});

/**
 * Media storage is an explicit dependency: when it is not configured the
 * mutation answers SERVICE_UNAVAILABLE instead of silently using a fake.
 */
function requireStorage(storage: ObjectStorage | undefined): ObjectStorage {
  if (storage === undefined) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "media storage is not configured",
    });
  }

  return storage;
}

export type MediaRouterDeps = {
  readonly media: MediaRepository;
  readonly business: BusinessRepository;
  readonly subscription: SubscriptionRepository;
  readonly storage: ObjectStorage | undefined;
};

export function createMediaRouter(deps: MediaRouterDeps) {
  const { media: repository, business, subscription, storage } = deps;

  return router({
    presignUpload: protectedProcedure.input(presignInput).mutation(async ({ input, ctx }) => {
      const activeStorage = requireStorage(storage);
      const scope = resolveMediaScope(input.kind, input.businessId);

      if (scope.type === "business") {
        await assertBusinessOwned(business, ctx.user.accountId, scope.businessId);
      }

      const plan = resolvePlan(await subscription.getActive(ctx.user.accountId));
      assertCanUploadMedia(plan, input.kind);

      const { key, uploadUrl } = await activeStorage.presignUpload({
        kind: input.kind,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        ownerId: ctx.user.accountId,
        businessId: input.businessId,
      });
      return { key, uploadUrl };
    }),

    confirm: protectedProcedure.input(confirmInput).mutation(async ({ input, ctx }) => {
      const activeStorage = requireStorage(storage);

      const parsed = parseMediaKey(input.key);

      if (
        parsed === null ||
        parsed.accountId !== ctx.user.accountId ||
        parsed.kind !== input.kind
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Object not found" });
      }

      if (parsed.extension !== mediaExtensionFor(input.kind, input.contentType)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Object not found" });
      }

      if (parsed.scope.type === "business") {
        await assertBusinessOwned(business, ctx.user.accountId, parsed.scope.businessId);
      }

      const meta = await activeStorage.readObject(input.key);

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

      const businessId = parsed.scope.type === "business" ? parsed.scope.businessId : null;
      const existing = await repository.findByR2Key(input.key);

      if (existing !== null) {
        return existing;
      }

      try {
        assertMediaContent(meta.contentType, meta.bytes);
      } catch (error) {
        if (error instanceof MediaValidationError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }

        throw error;
      }

      const plan = resolvePlan(await subscription.getActive(ctx.user.accountId));
      assertCanUploadMedia(plan, input.kind);

      try {
        return await repository.create({
          ownerId: ctx.user.accountId,
          businessId,
          kind: input.kind,
          r2Key: input.key,
          mime: meta.contentType,
          size: meta.size,
        });
      } catch (error) {
        const raced = await repository.findByR2Key(input.key);

        if (raced !== null) {
          return raced;
        }

        throw error;
      }
    }),

    signedUrl: protectedProcedure
      .input(idInput("Media id is required"))
      .query(async ({ input, ctx }) => {
        const activeStorage = requireStorage(storage);
        const media = await repository.getById(input.id);

        if (media === null || media.ownerId !== ctx.user.accountId) {
          throw new NotFoundError("Media not found");
        }

        return { url: await activeStorage.signedUrl(media.r2Key) };
      }),

    list: protectedProcedure
      .input(v.optional(offsetInputSchema, { limit: 20, offset: 0 }))
      .query(async ({ input, ctx }) => {
        return repository.listByOwner({
          ownerId: ctx.user.accountId,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    delete: protectedProcedure
      .input(idInput("Media id is required"))
      .mutation(async ({ input, ctx }) => {
        const activeStorage = requireStorage(storage);
        const media = await repository.getById(input.id);
        if (media === null || media.ownerId !== ctx.user.accountId) {
          throw new NotFoundError("Media not found");
        }
        await activeStorage.delete(media.r2Key);
        if (!(await repository.delete(input.id))) {
          throw new NotFoundError("Media not found");
        }
        return true;
      }),
  });
}
