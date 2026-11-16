import type { Account } from "@aqui-suena/api/domain/accounts/account";
import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { FiscalProfile } from "@aqui-suena/api/domain/billing/fiscal/fiscal-profile";
import { parseStoredFiscalProfile } from "@aqui-suena/api/domain/billing/fiscal/fiscal-profile";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";
import { resolveEmailLocale } from "@aqui-suena/api/domain/email/email-template";
import { parsePlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
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
      .prepare(`SELECT id, email, plan_id, locale, ${FISCAL_COLUMNS} FROM accounts WHERE id = ?`)
      .bind(id)
      .first();

    return row ? this.mapRow(row as AccountRow) : null;
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
        `UPDATE accounts SET rfc = ?, legal_name = ?, tax_regime = ?, tax_zip_code = ?,
           cfdi_use = ?, billing_email = ?, tax_data_updated_at = ?, updated_at = ?
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

    return {
      id: row.id,
      email: row.email,
      planId: parsePlanId(row.plan_id),
      locale: resolveEmailLocale(row.locale),
      ...(fiscalProfile === null ? {} : { fiscalProfile }),
    };
  }
}
