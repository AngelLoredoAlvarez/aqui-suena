import { NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";

/**
 * tRPC input parser for a single id.
 *
 * Every procedure takes an object input, so an id arrives as `{ id }` like the
 * rest of the API. Anything else is a client error, rejected as a
 * ValidationError (mapped to BAD_REQUEST at the transport).
 */
export function idInput(message: string): (value: unknown) => { id: string } {
  return (value: unknown) => {
    const id =
      typeof value === "object" && value !== null ? (value as { id?: unknown }).id : undefined;

    if (typeof id !== "string" || id.length === 0) {
      throw new ValidationError(message);
    }

    return { id };
  };
}

/**
 * Turns a repository's `T | null` lookup into a value or a NotFoundError,
 * which the base procedure maps to NOT_FOUND.
 */
export function requireFound<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new NotFoundError(message);
  }

  return value;
}
