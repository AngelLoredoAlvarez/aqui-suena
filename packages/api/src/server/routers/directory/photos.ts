import type { PhotoRepository } from "@aqui-suena/api/domain/directory/photo";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/trpc";
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

export function createPhotosRouter(repository: PhotoRepository) {
  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Photo id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: protectedProcedure
      .input(createPhotoInput)
      .mutation(async ({ input }) => repository.create(input)),

    update: protectedProcedure.input(updatePhotoInput).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return repository.update(id, rest);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Photo id is required");
        return value;
      })
      .mutation(async ({ input }) => repository.delete(input)),
  });
}
