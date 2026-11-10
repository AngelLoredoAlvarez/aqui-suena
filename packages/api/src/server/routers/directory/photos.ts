import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { PhotoRepository } from "@aqui-suena/api/domain/directory/photo";
import { assertBusinessOwned, notFound } from "@aqui-suena/api/server/routers/directory/access";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
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
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Photo id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: protectedProcedure.input(createPhotoInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updatePhotoInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = await repository.getById(id);

      if (current === null) throw notFound();

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return repository.update(id, rest);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Photo id is required");
        return value;
      })
      .mutation(async ({ input, ctx }) => {
        const current = await repository.getById(input);

        if (current === null) throw notFound();

        await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

        return repository.delete(input);
      }),
  });
}
