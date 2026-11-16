import type { Account } from "@aqui-suena/api/domain/accounts/account";
import type { FiscalProfile } from "@aqui-suena/api/domain/billing/fiscal/fiscal-profile";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

export interface AccountRepository {
  getById(id: string): Promise<Account | null>;
  updateLocale(id: string, locale: EmailLocale): Promise<void>;
  getFiscalProfile(id: string): Promise<FiscalProfile | null>;
  updateFiscalProfile(id: string, profile: FiscalProfile): Promise<void>;
}

export class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly store: Account[] = []) {}

  async getById(id: string): Promise<Account | null> {
    return this.store.find((account) => account.id === id) ?? null;
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
