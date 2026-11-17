import {
  UserDeletionError,
  type UserDirectory,
} from "@aqui-suena/api/domain/accounts/user-directory";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Identity-provider adapter. The client arrives from the composition root, so
 * credentials stay in one place and tests never touch the network.
 */
export class SupabaseUserDirectory implements UserDirectory {
  constructor(private readonly client: SupabaseClient) {}

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.client.auth.admin.deleteUser(userId);

    if (error === null) {
      return;
    }

    // Already missing is the end state we want: a retried purge has to finish.
    if (error.status === 404) {
      return;
    }

    throw new UserDeletionError(userId, error.message);
  }
}
