import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { Flyer, FlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import {
  assertAttachableMedia,
  deleteMediaAttachment,
} from "@aqui-suena/api/domain/directory/media-attachment";
import { resolveMediaUrl } from "@aqui-suena/api/domain/directory/media-url";
import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { findOwned } from "@aqui-suena/api/server/routers/directory/child-resource";
import { idInput, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { ConflictError, NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { cursorInputSchema } from "@aqui-suena/api/shared/pagination/input";
import * as v from "valibot";

const createFlyerInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  mediaId: v.pipe(v.string(), v.minLength(1)),
});

const updateFlyerInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  mediaId: v.optional(v.pipe(v.string(), v.minLength(1))),
});

export type FlyersRouterDeps = {
  readonly flyer: FlyerRepository;
  readonly business: BusinessRepository;
  readonly media: MediaRepository;
  readonly storage: ObjectStorage | undefined;
};

export function createFlyersRouter(deps: FlyersRouterDeps) {
  const { flyer: repository, business, media, storage } = deps;

  async function toView(item: Flyer) {
    return { ...item, url: await resolveMediaUrl(media, storage, item) };
  }

  return router({
    list: publicProcedure
      .input(v.optional(cursorInputSchema, { limit: 20 }))
      .query(async ({ input }) => {
        const page = await repository.list({ limit: input.limit, cursor: input.cursor ?? null });

        return { ...page, items: await Promise.all(page.items.map(toView)) };
      }),

    getById: publicProcedure.input(idInput("Flyer id is required")).query(async ({ input }) => {
      const item = requireFound(await repository.getById(input.id), "Flyer not found");
      requireFound(await business.getById(item.businessId), "Business not found");

      return toView(item);
    }),

    create: protectedProcedure.input(createFlyerInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      await assertAttachableMedia({
        media,
        accountId: ctx.user.accountId,
        businessId: input.businessId,
        mediaId: input.mediaId,
        kind: "flyer",
      });

      if ((await repository.findByMediaId(input.mediaId)) !== null) {
        throw new ConflictError("Media is already attached");
      }

      return toView(await repository.create(input));
    }),

    update: protectedProcedure.input(updateFlyerInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;

      await findOwned(
        (childId) => repository.getById(childId),
        business,
        ctx.user.accountId,
        id,
        "Flyer not found",
      );

      const current = requireFound(await repository.getById(id), "Flyer not found");

      if (rest.mediaId !== undefined) {
        await assertAttachableMedia({
          media,
          accountId: ctx.user.accountId,
          businessId: current.businessId,
          mediaId: rest.mediaId,
          kind: "flyer",
        });

        const attached = await repository.findByMediaId(rest.mediaId);

        if (attached !== null && attached.id !== id) {
          throw new ConflictError("Media is already attached");
        }
      }

      const updated = requireFound(await repository.update(id, rest), "Flyer not found");

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
      .input(idInput("Flyer id is required"))
      .mutation(async ({ input, ctx }) => {
        await findOwned(
          (childId) => repository.getById(childId),
          business,
          ctx.user.accountId,
          input.id,
          "Flyer not found",
        );

        const current = requireFound(await repository.getById(input.id), "Flyer not found");

        if (!(await repository.delete(input.id))) {
          throw new NotFoundError("Flyer not found");
        }

        await deleteMediaAttachment(media, storage, current.mediaId);

        return true;
      }),
  });
}
