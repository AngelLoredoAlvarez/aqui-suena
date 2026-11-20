import type { Account } from "@aqui-suena/api/domain/accounts/account";
import { ProcessRenewalReminders } from "@aqui-suena/api/domain/billing/subscriptions/process-renewal-reminders";
import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function subscription(id: string, accountId: string): Subscription {
  return {
    id,
    accountId,
    planId: "trades",
    billingInterval: "monthly",
    status: "active",
    startedAt: new Date("2026-10-26T12:00:00Z"),
    endsAt: new Date("2026-11-26T12:00:00Z"),
    graceEnd: null,
    createdAt: new Date("2026-10-26T12:00:00Z"),
    updatedAt: new Date("2026-10-26T12:00:00Z"),
  };
}

function account(id: string, overrides: Partial<Account> = {}): Account {
  return {
    id,
    email: `${id}@example.com`,
    planId: "trades",
    locale: "es-MX",
    ...overrides,
  };
}

function setup(options: {
  subscriptions: Subscription[];
  accounts: Account[];
  reminderErrorFor?: string;
  limit?: number;
}) {
  const calls: Array<{
    subscriptionId: string;
    options: { now: Date; recipientEmail: string; locale?: string };
  }> = [];
  const errors: Array<{ message: string; subscriptionId: string }> = [];
  let listArgs: { deadline: Date; limit: number } | undefined;

  const reminders = {
    async processSubscription(
      subscriptionId: string,
      processOptions: { now: Date; recipientEmail: string; locale?: string },
    ): Promise<[]> {
      if (options.reminderErrorFor === subscriptionId) {
        throw new Error("mail down");
      }

      calls.push({ subscriptionId, options: processOptions });

      return [];
    },
  };

  const subscriptions = {
    async listActiveEndingBefore(deadline: Date, limit: number): Promise<Subscription[]> {
      listArgs = { deadline, limit };

      return options.subscriptions;
    },
  };

  const accounts = {
    async getById(id: string): Promise<Account | null> {
      return options.accounts.find((candidate) => candidate.id === id) ?? null;
    },
  };

  const sweep = new ProcessRenewalReminders({
    subscriptions,
    accounts,
    reminders,
    limit: options.limit,
    now: () => NOW,
    onError: (message, subscriptionId) => errors.push({ message, subscriptionId }),
  });

  return { sweep, calls, errors, listArgs: () => listArgs };
}

describe("ProcessRenewalReminders", () => {
  it("processes active subscriptions and skips deleted or missing accounts", async () => {
    const { sweep, calls, listArgs } = setup({
      subscriptions: [
        subscription("sub-1", "acc-1"),
        subscription("sub-2", "acc-2"),
        subscription("sub-3", "acc-3"),
        subscription("sub-4", "acc-4"),
      ],
      accounts: [
        account("acc-1"),
        account("acc-2", { deletedAt: new Date("2026-11-18T00:00:00Z") }),
        account("acc-4"),
      ],
      limit: 2,
    });

    expect(await sweep.execute()).toBe(2);
    expect(calls).toEqual([
      {
        subscriptionId: "sub-1",
        options: { now: NOW, recipientEmail: "acc-1@example.com", locale: "es-MX" },
      },
      {
        subscriptionId: "sub-4",
        options: { now: NOW, recipientEmail: "acc-4@example.com", locale: "es-MX" },
      },
    ]);
    expect(listArgs()).toEqual({
      deadline: new Date(NOW.getTime() + 7 * DAY_MS),
      limit: 2,
    });
  });

  it("logs a reminder failure and continues with the next subscription", async () => {
    const { sweep, calls, errors } = setup({
      subscriptions: [subscription("sub-1", "acc-1"), subscription("sub-2", "acc-2")],
      accounts: [account("acc-1"), account("acc-2")],
      reminderErrorFor: "sub-1",
    });

    expect(await sweep.execute()).toBe(1);
    expect(errors).toEqual([{ message: "mail down", subscriptionId: "sub-1" }]);
    expect(calls.map((call) => call.subscriptionId)).toEqual(["sub-2"]);
  });
});
