import { DomainError } from "@aqui-suena/api/shared/domain-error";

/**
 * Port for the identity provider. The system of record for "can this person
 * sign in" lives outside our database, so account deletion has to reach it.
 */
export interface UserDirectory {
  /** Resolves when the user is gone, including when it was already missing. */
  deleteUser(userId: string): Promise<void>;
}

export class UserDeletionError extends DomainError {
  constructor(
    readonly userId: string,
    message: string,
  ) {
    super(`Could not delete the login for ${userId}: ${message}`);

    this.name = "UserDeletionError";
  }
}
