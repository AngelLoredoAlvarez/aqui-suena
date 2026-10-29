import type { PlanId } from "@aqui-suena/api/entitlements";
import {
  canCreateProduct,
  isWithinPhotoQuota,
  isWithinProductPhotoQuota,
  isWithinProductQuota,
} from "@aqui-suena/api/entitlements";
import {
  capProducts,
  createProductInputSchema,
  deriveListingOpen,
  listingInputSchema,
} from "@aqui-suena/api/listing";

import { publicProcedure, router } from "@aqui-suena/api/trpc";
import { TRPCError } from "@trpc/server";
import * as v from "valibot";

const createProductInput = v.object({
  plan: v.picklist(["free", "premium"]),
  businessId: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  price: v.pipe(v.number(), v.integer(), v.minValue(1)),
  currentProductCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

const addPhotoInput = v.object({
  plan: v.picklist(["free", "premium"]),
  businessId: v.pipe(v.string(), v.minLength(1)),
  kind: v.picklist(["flyer", "logo", "product"]),
  url: v.pipe(v.string(), v.url()),
  currentPhotoCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  currentProductPhotoCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

const getListingInput = v.object({
  listing: listingInputSchema,
  now: v.optional(v.date()),
});

const listListingsInput = v.object({
  plan: v.picklist(["free", "premium"]),
  items: v.array(
    v.object({
      listing: listingInputSchema,
      products: v.array(createProductInputSchema),
    }),
  ),
  now: v.optional(v.date()),
});

export const businessRouter = router({
  createProduct: publicProcedure.input(createProductInput).mutation(({ input }) => {
    const plan = input.plan as PlanId;

    // TODO(memberships): derive plan from ctx.account instead of input (untrusted).
    // TODO: server must recount products from DB; client count is untrusted.
    const productPermission = canCreateProduct(plan);
    if (!productPermission.allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `UPGRADE_REQUIRED: ${productPermission.hint}`,
      });
    }
    const used = input.currentProductCount ?? 0;

    if (!isWithinProductQuota(plan, used)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "UPGRADE_REQUIRED: product quota exceeded",
      });
    }

    return { id: crypto.randomUUID(), name: input.name, price: input.price };
  }),

  addPhoto: publicProcedure.input(addPhotoInput).mutation(({ input }) => {
    const plan = input.plan as PlanId;
    const isMarketing = input.kind === "flyer" || input.kind === "logo";

    if (input.kind === "product" && plan === "free") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "UPGRADE_REQUIRED: product photos require premium",
      });
    }

    if (input.kind === "product") {
      const used = input.currentProductPhotoCount ?? 0;

      if (!isWithinProductPhotoQuota(plan, used)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "PRODUCT_PHOTO_QUOTA_EXCEEDED",
        });
      }
    }

    if (isMarketing) {
      const used = input.currentPhotoCount ?? 0;

      if (!isWithinPhotoQuota(plan, used)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "UPGRADE_REQUIRED: photo quota exceeded",
        });
      }
    }

    return { id: crypto.randomUUID(), kind: input.kind };
  }),

  get: publicProcedure.input(getListingInput).query(({ input }) => {
    const now = input.now ?? new Date();
    // TODO(memberships): look up by id from DB and return 404 when missing.

    return { ...input.listing, open: deriveListingOpen(input.listing, now) };
  }),

  list: publicProcedure.input(listListingsInput).query(({ input }) => {
    const now = input.now ?? new Date();
    // TODO(memberships): read from DB and paginate; hidden (capped) items are not deleted.

    return input.items.map((item) => ({
      listing: item.listing,
      open: deriveListingOpen(item.listing, now),
      products: capProducts(item.products, input.plan),
    }));
  }),

  create: publicProcedure.input(listingInputSchema).mutation(({ input }) => {
    // Mock-first (T2): no persistence yet. Memberships will add DB writes.
    return { id: crypto.randomUUID(), ...input };
  }),
});
