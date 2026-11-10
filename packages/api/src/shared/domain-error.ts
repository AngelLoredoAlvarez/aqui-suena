/**
 * Base class for errors that describe a broken domain invariant rather than a
 * programming mistake. The server layer maps them to typed transport codes.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * A value that was persisted (or otherwise external) does not match the
 * domain contract: an unknown enum member, a malformed stored field, etc.
 * It carries the offending field and value so callers can log them without
 * leaking the value to the client.
 */
export class DataIntegrityError extends DomainError {
  readonly field: string;
  readonly value: unknown;

  constructor(field: string, value: unknown) {
    super(`Invalid persisted value for ${field}: ${String(value)}`);
    this.name = "DataIntegrityError";
    this.field = field;
    this.value = value;
  }
}
