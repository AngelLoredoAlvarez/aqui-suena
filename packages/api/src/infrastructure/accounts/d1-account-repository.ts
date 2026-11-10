import type { Account } from "@aqui-suena/api/domain/accounts/account";
import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { PlanId } from "@aqui-suena/api/domain/billing/entitlements";
import type { EmailLocale } from "@aqui-suena/api/domain/email/email-template";
import { resolveEmailLocale } from "@aqui-suena/api/domain/email/email-template";
import { toEpoch } from "@aqui-suena/api/infrastructure/shared/d1-epoch";

type AccountRow = {
  id: string;
  email: string;
  plan_id: string;
  locale: string | null;
};

export class D1AccountRepository implements AccountRepository {
  constructor(private readonly db: D1Database) {}

  async getById(id: string): Promise<Account | null> {
    const row = await this.db
      .prepare("SELECT id, email, plan_id, locale FROM accounts WHERE id = ?")
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

  private mapRow(row: AccountRow): Account {
    return {
      id: row.id,
      email: row.email,
      planId: row.plan_id as PlanId,
      locale: resolveEmailLocale(row.locale),
    };
  }
}
