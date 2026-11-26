import type { Account, SavedCard } from "@aqui-suena/api/domain/accounts/account";
import type { FiscalProfile } from "@aqui-suena/api/domain/accounts/fiscal-profile";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";
import { DomainError } from "@aqui-suena/api/shared/domain-error";

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
  updateRenewalRemindersEnabled(id: string, enabled: boolean): Promise<void>;
}
