import type { Account } from "@aqui-suena/api/domain/accounts/account";
import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { PaymentCustomerDeleter } from "@aqui-suena/api/domain/accounts/payment-customer-deleter";
import type { UserDirectory } from "@aqui-suena/api/domain/accounts/user-directory";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/model/business";
import type { MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

export type DeleteAccountDependencies = {
  readonly accounts: AccountRepository;
  readonly users: UserDirectory;
  readonly media: MediaRepository;
  readonly storage: ObjectStorage;
  readonly businesses: BusinessRepository;
  readonly paymentCustomers?: PaymentCustomerDeleter;
  readonly onPaymentCustomerError?: (error: unknown, customerId: string) => void;
  readonly onMediaPurgeError?: (error: unknown) => void;
};

const MEDIA_PAGE_SIZE = 100;
const LEGACY_MEDIA_PREFIXES = ["avatar", "flyer", "product-photo", "spot-audio"] as const;

function accountMediaPrefixes(accountId: string): string[] {
  return [
    `media/v1/${accountId}/`,
    ...LEGACY_MEDIA_PREFIXES.map((kind) => `${kind}/${accountId}/`),
  ];
}

/**
 * Erases what is personal and keeps what the law requires. The account row
 * survives as a tombstone because invoices and payments point at it.
 *
 * The order is the contract: the login dies first, so an interrupted run can
 * never let the owner sign back in to an account we already anonymized.
 */
export class DeleteAccount {
  constructor(private readonly deps: DeleteAccountDependencies) {}

  async execute(accountId: string): Promise<void> {
    const account = await this.deps.accounts.getById(accountId);

    if (account === null) {
      throw new NotFoundError("Account not found");
    }

    if (account.deletedAt != null) {
      return;
    }

    await this.deps.users.deleteUser(accountId);
    await this.purgeMedia(accountId);
    await this.deps.businesses.deleteByAccount(accountId);
    await this.deletePaymentCustomer(account);
    await this.deps.accounts.anonymize(accountId);
  }

  private async deletePaymentCustomer(account: Account): Promise<void> {
    const customerId = account.savedCard?.customerId;

    if (customerId === undefined || customerId.length === 0) {
      return;
    }

    const deleter = this.deps.paymentCustomers;

    if (deleter === undefined) {
      return;
    }

    try {
      await deleter.deleteCustomer(customerId);
    } catch (error) {
      this.deps.onPaymentCustomerError?.(error, customerId);
    }
  }

  private async purgeMedia(accountId: string): Promise<void> {
    for (;;) {
      // Offset stays at zero on purpose: rows disappear as we delete them, so
      // advancing the offset would skip half of the remaining page.
      const page = await this.deps.media.listByOwner({
        ownerId: accountId,
        limit: MEDIA_PAGE_SIZE,
        offset: 0,
      });

      if (page.items.length === 0) {
        await this.purgeAccountPrefixes(accountId);

        return;
      }

      for (const item of page.items) {
        // Object first: the row holds the only pointer to its R2 key.
        await this.deps.storage.delete(item.r2Key);

        if (!(await this.deps.media.delete(item.id))) {
          throw new Error(`Media row vanished during purge: ${item.id}`);
        }
      }
    }
  }

  private async purgeAccountPrefixes(accountId: string): Promise<void> {
    try {
      for (const prefix of accountMediaPrefixes(accountId)) {
        for (const object of await this.deps.storage.list(prefix)) {
          await this.deps.storage.delete(object.key);
        }
      }
    } catch (error) {
      this.deps.onMediaPurgeError?.(error);
    }
  }
}
