import { DeleteAccount } from "@aqui-suena/api/domain/accounts/delete-account";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { SupabaseUserDirectory } from "@aqui-suena/api/infrastructure/accounts/supabase-user-directory";
import { createSupabaseAdminClient } from "@aqui-suena/api/server/auth/supabase";
import type { DirectoryRepositories } from "@aqui-suena/api/server/composition/repositories";

export type DeleteAccountWiring = {
  readonly repositories: DirectoryRepositories;
  readonly storage?: ObjectStorage;
  readonly supabaseUrl?: string;
  readonly supabaseSecretKey?: string;
};

/**
 * Deletion is all-or-nothing: without storage and the service key we cannot
 * finish it, so the feature stays unavailable instead of half-working.
 */
export function createDeleteAccount(
  wiring: DeleteAccountWiring,
): Pick<DeleteAccount, "execute"> | undefined {
  const client = createSupabaseAdminClient(wiring.supabaseUrl, wiring.supabaseSecretKey);

  if (wiring.storage === undefined || client === null) {
    return undefined;
  }

  return new DeleteAccount({
    accounts: wiring.repositories.account,
    users: new SupabaseUserDirectory(client),
    media: wiring.repositories.media,
    storage: wiring.storage,
    businesses: wiring.repositories.business,
  });
}
