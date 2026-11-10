import type { Account } from "@aqui-suena/api/domain/accounts/account";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";

export interface AccountRepository {
  getById(id: string): Promise<Account | null>;
  updateLocale(id: string, locale: EmailLocale): Promise<void>;
}

export class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly store: Account[] = []) {}

  async getById(id: string): Promise<Account | null> {
    return this.store.find((account) => account.id === id) ?? null;
  }

  async updateLocale(id: string, locale: EmailLocale): Promise<void> {
    const account = this.store.find((candidate) => candidate.id === id);

    if (account === undefined) {
      throw new Error("Account not found");
    }

    const index = this.store.indexOf(account);

    this.store.splice(index, 1, { ...account, locale });
  }
}
