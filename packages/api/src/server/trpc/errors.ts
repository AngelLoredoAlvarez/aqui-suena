import { NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";

/**
 * tRPC input parser for required ids. Malformed input is a client error, so it
 * is rejected as a ValidationError (mapped to BAD_REQUEST at the transport).
 */
export function requiredId(message: string): (value: unknown) => string {
  return (value: unknown) => {
    if (typeof value !== "string" || value.length === 0) {
      throw new ValidationError(message);
    }

    return value;
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
