import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { RenewalReminderService } from "@aqui-suena/api/domain/billing/subscriptions/renewal-reminder-service";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKAHEAD_DAYS = 7;
const DEFAULT_LIMIT = 5;

export type ProcessRenewalRemindersDependencies = {
  readonly subscriptions: Pick<SubscriptionRepository, "listActiveEndingBefore">;
  readonly accounts: Pick<AccountRepository, "getById">;
  readonly reminders: Pick<RenewalReminderService, "processSubscription">;
  readonly limit?: number;
  readonly now?: () => Date;
  readonly onError?: (message: string, subscriptionId: string) => void;
};

export class ProcessRenewalReminders {
  constructor(private readonly deps: ProcessRenewalRemindersDependencies) {}

  async execute(): Promise<number> {
    const now = this.deps.now?.() ?? new Date();
    const deadline = new Date(now.getTime() + LOOKAHEAD_DAYS * DAY_MS);
    const subscriptions = await this.deps.subscriptions.listActiveEndingBefore(
      deadline,
      this.deps.limit ?? DEFAULT_LIMIT,
    );
    let processed = 0;

    for (const subscription of subscriptions) {
      try {
        const account = await this.deps.accounts.getById(subscription.accountId);

        if (account === null || account.deletedAt) {
          continue;
        }

        await this.deps.reminders.processSubscription(subscription.id, {
          now,
          recipientEmail: account.email,
          locale: account.locale,
          preferences: {
            renewalRemindersEnabled: account.renewalRemindersEnabled ?? true,
          },
        });

        processed += 1;
      } catch (error) {
        this.deps.onError?.(
          error instanceof Error ? error.message : "unknown error",
          subscription.id,
        );
      }
    }

    return processed;
  }
}
