import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { PhotoRepository } from "@aqui-suena/api/domain/directory/photo";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { requiredId, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { offsetPageEntries } from "@aqui-suena/api/shared/pagination/input";
import * as v from "valibot";

const photoKind = v.picklist(["logo", "product", "work"]);

const createPhotoInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  workEntryId: v.nullable(v.string()),
  productId: v.nullable(v.string()),
  kind: photoKind,
  url: v.pipe(v.string(), v.url()),
});

const updatePhotoInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  workEntryId: v.optional(v.nullable(v.string())),
  productId: v.optional(v.nullable(v.string())),
  kind: v.optional(photoKind),
  url: v.optional(v.pipe(v.string(), v.url())),
});

export type PhotosRouterDeps = {
  readonly photo: PhotoRepository;
  readonly business: BusinessRepository;
};

export function createPhotosRouter(deps: PhotosRouterDeps) {
  const { photo: repository, business } = deps;

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

        return repository.listByBusiness(input);
      }),

    getById: publicProcedure
      .input(requiredId("Photo id is required"))
      .query(async ({ input }) => requireFound(await repository.getById(input), "Photo not found")),

    create: protectedProcedure.input(createPhotoInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updatePhotoInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = requireFound(await repository.getById(id), "Photo not found");

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return requireFound(await repository.update(id, rest), "Photo not found");
    }),

    delete: protectedProcedure
      .input(requiredId("Photo id is required"))
      .mutation(async ({ input, ctx }) => {
        const current = requireFound(await repository.getById(input), "Photo not found");

        await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

        if (!(await repository.delete(input))) {
          throw new NotFoundError("Photo not found");
        }

        return true;
      }),
  });
}
