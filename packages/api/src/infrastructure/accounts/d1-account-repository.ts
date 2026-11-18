import {
  type Account,
  anonymizedAccountEmail,
  normalizeAccountEmail,
} from "@aqui-suena/api/domain/accounts/account";
import {
  AccountEmailConflictError,
  type AccountRepository,
} from "@aqui-suena/api/domain/accounts/account-repository";
import type { FiscalProfile } from "@aqui-suena/api/domain/accounts/fiscal-profile";
import { parseStoredFiscalProfile } from "@aqui-suena/api/domain/accounts/fiscal-profile";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";
import { resolveEmailLocale } from "@aqui-suena/api/domain/email/email-template";
import { parsePlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

type AccountRow = {
  id: string;
  email: string;
  plan_id: string;
  locale: string | null;
  rfc: string | null;
  legal_name: string | null;
  tax_regime: string | null;
  tax_zip_code: string | null;
  cfdi_use: string | null;
  billing_email: string | null;
  deleted_at: number | null;
};

type FiscalRow = {
  rfc: string | null;
  legal_name: string | null;
  tax_regime: string | null;
  tax_zip_code: string | null;
  cfdi_use: string | null;
  billing_email: string | null;
};

const FISCAL_COLUMNS = "rfc, legal_name, tax_regime, tax_zip_code, cfdi_use, billing_email";

export class D1AccountRepository implements AccountRepository {
  constructor(private readonly db: D1Database) {}

  async getById(id: string): Promise<Account | null> {
    const row = await this.db
      .prepare(
        `SELECT id, email, plan_id, locale, deleted_at, ${FISCAL_COLUMNS} FROM accounts WHERE id = ?`,
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as AccountRow) : null;
  }

  async ensure(id: string, email: string): Promise<void> {
    const normalized = normalizeAccountEmail(email);

    const existing = (await this.db
      .prepare("SELECT email FROM accounts WHERE id = ?")
      .bind(id)
      .first()) as { email: string } | null;

    if (existing === null) {
      const now = toEpoch(new Date());

      try {
        await this.db
          .prepare(
            `INSERT INTO accounts (id, email, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING`,
          )
          .bind(id, normalized, now, now)
          .run();
      } catch (error) {
        if (!isAccountEmailUniqueViolation(error)) {
          throw error;
        }

        throw await this.conflict(id, normalized);
      }

      return;
    }

    if (existing.email !== normalized) {
      try {
        await this.db
          .prepare("UPDATE accounts SET email = ?, updated_at = ? WHERE id = ?")
          .bind(normalized, toEpoch(new Date()), id)
          .run();
      } catch (error) {
        if (!isAccountEmailUniqueViolation(error)) {
          throw error;
        }

        throw await this.conflict(id, normalized);
      }
    }
  }

  private async conflict(id: string, email: string): Promise<AccountEmailConflictError> {
    const owner = (await this.db
      .prepare("SELECT id FROM accounts WHERE email = ?")
      .bind(email)
      .first()) as { id: string } | null;

    return new AccountEmailConflictError(id, owner?.id ?? "unknown");
  }

  async anonymize(id: string): Promise<void> {
    const now = toEpoch(new Date());

    const result = await this.db
      .prepare(
        `UPDATE accounts
        SET email = ?, rfc = NULL, legal_name = NULL, tax_regime = NULL, tax_zip_code = NULL,
        cfdi_use = NULL, billing_email = NULL, tax_data_updated_at = NULL,
        deleted_at = COALESCE(deleted_at, ?), updated_at = ?
        WHERE id = ?`,
      )
      .bind(anonymizedAccountEmail(id), now, now, id)
      .run();

    if ((result.meta?.changes ?? 0) === 0) {
      throw new NotFoundError("Account not found");
    }
  }

  async updateLocale(id: string, locale: EmailLocale): Promise<void> {
    await this.db
      .prepare("UPDATE accounts SET locale = ?, updated_at = ? WHERE id = ?")
      .bind(locale, toEpoch(new Date()), id)
      .run();
  }

  async getFiscalProfile(id: string): Promise<FiscalProfile | null> {
    const row = await this.db
      .prepare(`SELECT ${FISCAL_COLUMNS} FROM accounts WHERE id = ?`)
      .bind(id)
      .first();

    return row ? parseStoredFiscalProfile(row as FiscalRow) : null;
  }

  async updateFiscalProfile(id: string, profile: FiscalProfile): Promise<void> {
    const now = toEpoch(new Date());
    const result = await this.db
      .prepare(
        `UPDATE accounts
        SET rfc = ?, legal_name = ?, tax_regime = ?, tax_zip_code = ?, cfdi_use = ?,
        billing_email = ?, tax_data_updated_at = ?, updated_at = ?
        WHERE id = ?`,
      )
      .bind(
        profile.rfc,
        profile.legalName,
        profile.taxRegime,
        profile.taxZipCode,
        profile.cfdiUse,
        profile.billingEmail,
        now,
        now,
        id,
      )
      .run();

    if ((result.meta?.changes ?? 0) === 0) {
      throw new NotFoundError("Account not found");
    }
  }

  private mapRow(row: AccountRow): Account {
    const fiscalProfile = parseStoredFiscalProfile(row);
    // Nullable columns can be absent from a partially-shaped row; treat both as unset.
    const deletedAt = row.deleted_at == null ? null : fromEpoch(row.deleted_at);

    return {
      id: row.id,
      email: row.email,
      planId: parsePlanId(row.plan_id),
      locale: resolveEmailLocale(row.locale),
      ...(fiscalProfile === null ? {} : { fiscalProfile }),
      ...(deletedAt === null ? {} : { deletedAt }),
    };
  }
}

/**
 * D1 and node:sqlite both report the same constraint text, so one check covers
 * the Worker and the local adapter. Anything else is a real failure.
 */
function isAccountEmailUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("UNIQUE constraint failed: accounts.email")
  );
}
