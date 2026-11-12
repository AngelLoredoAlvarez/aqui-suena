import { decodeCursor } from "@aqui-suena/api/shared/pagination/cursor";
import * as v from "valibot";

export const paginationLimitSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.maxValue(100),
);

export const offsetInputSchema = v.object({
  limit: v.optional(paginationLimitSchema, 20),
  offset: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 0),
});

export const cursorInputSchema = v.object({
  limit: v.optional(paginationLimitSchema, 20),
  cursor: v.optional(
    v.pipe(
      v.string(),
      v.check((value) => decodeCursor(value) !== null, "invalid cursor"),
    ),
  ),
});
