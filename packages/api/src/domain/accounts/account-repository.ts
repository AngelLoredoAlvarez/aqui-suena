import type { Account, SavedCard } from "@aqui-suena/api/domain/accounts/account";
import {
  anonymizedAccountEmail,
  DEFAULT_ACCOUNT_LOCALE,
  DEFAULT_ACCOUNT_PLAN,
  normalizeAccountEmail,
} from "@aqui-suena/api/domain/accounts/account";
import type { FiscalProfile } from "@aqui-suena/api/domain/accounts/fiscal-profile";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";
import { DomainError, NotFoundError } from "@aqui-suena/api/shared/domain-error";

export class AccountEmailConflictError extends DomainError {
  constructor(
    readonly accountId: string,
    readonly ownerId: string,
  ) {
    super(`Account email is already owned by another account (${ownerId})`);
    this.name = "AccountEmailConflictError";
  }
}

export interface AccountRepository {
  getById(id: string): Promise<Account | null>;
  ensure(id: string, email: string): Promise<void>;
  anonymize(id: string): Promise<void>;
  updateLocale(id: string, locale: EmailLocale): Promise<void>;
  getFiscalProfile(id: string): Promise<FiscalProfile | null>;
  updateFiscalProfile(id: string, profile: FiscalProfile): Promise<void>;
  getSavedCard(id: string): Promise<SavedCard | null>;
  saveCard(id: string, card: SavedCard): Promise<void>;
}

export class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly store: Account[] = []) {}

  async getById(id: string): Promise<Account | null> {
    return this.store.find((account) => account.id === id) ?? null;
  }

  async ensure(id: string, email: string): Promise<void> {
    const normalized = normalizeAccountEmail(email);
    const existing = this.store.find((account) => account.id === id);

    if (existing === undefined) {
      const owner = this.store.find((account) => account.email === normalized);

      if (owner !== undefined) {
        throw new AccountEmailConflictError(id, owner.id);
      }

      this.store.push({
        id,
        email: normalized,
        planId: DEFAULT_ACCOUNT_PLAN,
        locale: DEFAULT_ACCOUNT_LOCALE,
      });

      return;
    }

    if (existing.email !== normalized) {
      this.replace(id, (account) => ({ ...account, email: normalized }));
    }
  }

  async anonymize(id: string): Promise<void> {
    this.replace(id, (account) => ({
      id: account.id,
      email: anonymizedAccountEmail(account.id),
      planId: account.planId,
      locale: account.locale,
      deletedAt: account.deletedAt ?? new Date(),
    }));
  }

  async updateLocale(id: string, locale: EmailLocale): Promise<void> {
    this.replace(id, (account) => ({ ...account, locale }));
  }

  async getFiscalProfile(id: string): Promise<FiscalProfile | null> {
    const account = this.findOrThrow(id);

    return account.fiscalProfile ?? null;
  }

  async updateFiscalProfile(id: string, profile: FiscalProfile): Promise<void> {
    this.replace(id, (account) => ({ ...account, fiscalProfile: profile }));
  }

  async getSavedCard(id: string): Promise<SavedCard | null> {
    const account = this.store.find((candidate) => candidate.id === id);

    return account?.savedCard ?? null;
  }

  async saveCard(id: string, card: SavedCard): Promise<void> {
    this.replace(id, (account) => ({ ...account, savedCard: card }));
  }

  private findOrThrow(id: string): Account {
    const account = this.store.find((candidate) => candidate.id === id);

    if (account === undefined) {
      throw new NotFoundError("Account not found");
    }

    return account;
  }

  private replace(id: string, update: (account: Account) => Account): void {
    const account = this.findOrThrow(id);
    const index = this.store.indexOf(account);

    this.store.splice(index, 1, update(account));
  }
}
