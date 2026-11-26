import type { BusinessRepository } from "@aqui-suena/api/domain/directory/model/business";
import {
  assertAttachableMedia,
  deleteMediaAttachment,
} from "@aqui-suena/api/domain/directory/model/media-attachment";
import { resolveMediaUrl } from "@aqui-suena/api/domain/directory/model/media-url";
import type { Photo, PhotoRepository } from "@aqui-suena/api/domain/directory/model/photo";
import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { findOwned } from "@aqui-suena/api/server/routers/directory/child-resource";
import { idInput, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { ConflictError, NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { offsetPageEntries } from "@aqui-suena/api/shared/pagination/input";
import * as v from "valibot";

const photoKind = v.picklist(["logo", "product", "work"]);

const createPhotoInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  workEntryId: v.nullable(v.string()),
  productId: v.nullable(v.string()),
  kind: photoKind,
  mediaId: v.pipe(v.string(), v.minLength(1)),
});

const updatePhotoInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  workEntryId: v.optional(v.nullable(v.string())),
  productId: v.optional(v.nullable(v.string())),
  kind: v.optional(photoKind),
  mediaId: v.optional(v.pipe(v.string(), v.minLength(1))),
});

export type PhotosRouterDeps = {
  readonly photo: PhotoRepository;
  readonly business: BusinessRepository;
  readonly media: MediaRepository;
  readonly storage: ObjectStorage | undefined;
};

export function createPhotosRouter(deps: PhotosRouterDeps) {
  const { photo: repository, business, media, storage } = deps;

  async function toView(item: Photo) {
    return { ...item, url: await resolveMediaUrl(media, storage, item) };
  }

  return router({
    listByBusiness: publicProcedure
      .input(
        v.object({
          businessId: v.pipe(v.string(), v.minLength(1)),
          ...offsetPageEntries,
        }),
      )
      .query(async ({ input }) => {
        requireFound(await business.getById(input.businessId), "Business not found");
        const page = await repository.listByBusiness(input);

        return { ...page, items: await Promise.all(page.items.map(toView)) };
      }),

    getById: publicProcedure.input(idInput("Photo id is required")).query(async ({ input }) => {
      const item = requireFound(await repository.getById(input.id), "Photo not found");
      requireFound(await business.getById(item.businessId), "Business not found");

      return toView(item);
    }),

    create: protectedProcedure.input(createPhotoInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      await assertAttachableMedia({
        media,
        accountId: ctx.user.accountId,
        businessId: input.businessId,
        mediaId: input.mediaId,
        kind: "product-photo",
      });

      if ((await repository.findByMediaId(input.mediaId)) !== null) {
        throw new ConflictError("Media is already attached");
      }

      return toView(await repository.create(input));
    }),

    update: protectedProcedure.input(updatePhotoInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;

      await findOwned(
        (childId) => repository.getById(childId),
        business,
        ctx.user.accountId,
        id,
        "Photo not found",
      );

      const current = requireFound(await repository.getById(id), "Photo not found");

      if (rest.mediaId !== undefined) {
        await assertAttachableMedia({
          media,
          accountId: ctx.user.accountId,
          businessId: current.businessId,
          mediaId: rest.mediaId,
          kind: "product-photo",
        });

        const attached = await repository.findByMediaId(rest.mediaId);

        if (attached !== null && attached.id !== id) {
          throw new ConflictError("Media is already attached");
        }
      }

      const updated = requireFound(await repository.update(id, rest), "Photo not found");

      if (
        rest.mediaId !== undefined &&
        current.mediaId !== null &&
        current.mediaId !== rest.mediaId
      ) {
        await deleteMediaAttachment(media, storage, current.mediaId);
      }

      return toView(updated);
    }),

    delete: protectedProcedure
      .input(idInput("Photo id is required"))
      .mutation(async ({ input, ctx }) => {
        await findOwned(
          (childId) => repository.getById(childId),
          business,
          ctx.user.accountId,
          input.id,
          "Photo not found",
        );

        const current = requireFound(await repository.getById(input.id), "Photo not found");

        if (!(await repository.delete(input.id))) {
          throw new NotFoundError("Photo not found");
        }

        await deleteMediaAttachment(media, storage, current.mediaId);

        return true;
      }),
  });
}
