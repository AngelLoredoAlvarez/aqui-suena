import { DatabaseSync } from "node:sqlite";
import type { ReminderType } from "@aqui-suena/api/domain/billing/subscriptions/model/reminders";
import { D1SubscriptionRepository } from "@aqui-suena/api/infrastructure/billing/subscriptions/d1-subscription-repository";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-20T12:00:00Z");

const DDL = `
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    deleted_at INTEGER
  );
  CREATE TABLE account_preferences (
    account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    renewal_reminders_enabled INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    plan_id TEXT NOT NULL,
    billing_interval TEXT NOT NULL DEFAULT 'monthly',
    status TEXT NOT NULL DEFAULT 'active',
    started_at INTEGER NOT NULL,
    ends_at INTEGER,
    grace_end INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE subscription_reminders (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    period_ends_at INTEGER NOT NULL,
    sent_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX subscription_reminders_subscription_type_period_unique
    ON subscription_reminders (subscription_id, type, period_ends_at);
`;

function createD1Adapter(database: DatabaseSync): D1Database {
  return {
    prepare: (sql: string) => {
      let parameters: Array<string | number | bigint | Uint8Array | null> = [];
      const statement = {
        bind: (...values: Array<string | number | bigint | Uint8Array | null>) => {
          parameters = values;

          return statement;
        },
        all: async () => ({ results: database.prepare(sql).all(...parameters) }),
        first: async () => database.prepare(sql).get(...parameters) ?? null,
        run: async () => {
          const result = database.prepare(sql).run(...parameters);

          return { success: true, meta: { changes: Number(result.changes) } };
        },
      };

      return statement;
    },
  } as unknown as D1Database;
}

type SeedInput = {
  readonly id: string;
  readonly accountId: string;
  readonly endsAt: Date;
  readonly status?: string;
  readonly deletedAt?: Date;
  readonly remindersEnabled?: boolean;
  readonly reminders?: Array<{ readonly type: ReminderType; readonly periodEndsAt?: Date }>;
};

function seed(database: DatabaseSync, input: SeedInput): void {
  const startedAt = new Date("2026-10-20T12:00:00Z");

  database
    .prepare("INSERT INTO accounts (id, deleted_at) VALUES (?, ?)")
    .run(input.accountId, input.deletedAt === undefined ? null : toEpoch(input.deletedAt));
  database
    .prepare(
      "INSERT INTO account_preferences (account_id, renewal_reminders_enabled) VALUES (?, ?)",
    )
    .run(input.accountId, input.remindersEnabled === false ? 0 : 1);
  database
    .prepare(
      `INSERT INTO subscriptions (
        id, account_id, plan_id, billing_interval, status,
        started_at, ends_at, grace_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.accountId,
      "trades",
      "monthly",
      input.status ?? "active",
      toEpoch(startedAt),
      toEpoch(input.endsAt),
      null,
      toEpoch(startedAt),
      toEpoch(startedAt),
    );

  for (const reminder of input.reminders ?? []) {
    const periodEndsAt = reminder.periodEndsAt ?? input.endsAt;

    database
      .prepare(
        "INSERT INTO subscription_reminders (id, subscription_id, type, period_ends_at, sent_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        `${input.id}-${reminder.type}-${periodEndsAt.getTime()}`,
        input.id,
        reminder.type,
        toEpoch(periodEndsAt),
        toEpoch(NOW),
      );
  }
}

function prepareDatabase(seeds: SeedInput[]): DatabaseSync {
  const database = new DatabaseSync(":memory:");

  database.exec(DDL);

  for (const input of seeds) {
    seed(database, input);
  }

  return database;
}

describe("D1SubscriptionRepository reminder candidates", () => {
  it("selects only the subscriptions that still owe the reminder due now", async () => {
    const database = prepareDatabase([
      { id: "sub-1d", accountId: "acc-1", endsAt: new Date("2026-11-21T12:00:00Z") },
      { id: "sub-7d", accountId: "acc-2", endsAt: new Date("2026-11-25T12:00:00Z") },
      {
        id: "sub-7d-sent",
        accountId: "acc-3",
        endsAt: new Date("2026-11-24T12:00:00Z"),
        reminders: [{ type: "renewal_7d" }],
      },
      {
        id: "sub-1d-sent",
        accountId: "acc-4",
        endsAt: new Date("2026-11-21T12:00:00Z"),
        reminders: [{ type: "renewal_1d" }],
      },
      {
        id: "sub-disabled",
        accountId: "acc-5",
        endsAt: new Date("2026-11-23T12:00:00Z"),
        remindersEnabled: false,
      },
      {
        id: "sub-deleted",
        accountId: "acc-6",
        endsAt: new Date("2026-11-23T12:00:00Z"),
        deletedAt: new Date("2026-11-19T00:00:00Z"),
      },
      { id: "sub-past", accountId: "acc-7", endsAt: new Date("2026-11-19T12:00:00Z") },
      { id: "sub-day8", accountId: "acc-8", endsAt: new Date("2026-11-28T12:00:00Z") },
      {
        id: "sub-cancelled",
        accountId: "acc-9",
        endsAt: new Date("2026-11-23T12:00:00Z"),
        status: "cancelled",
      },
      {
        id: "sub-grace",
        accountId: "acc-10",
        endsAt: new Date("2026-11-23T12:00:00Z"),
        status: "grace",
      },
    ]);

    const repository = new D1SubscriptionRepository(createD1Adapter(database));

    const candidates = await repository.listReminderCandidates(NOW, 10);

    expect(candidates.map((subscription) => subscription.id)).toEqual(["sub-1d", "sub-7d"]);
  });

  it("selects every UTC day from 0 through 7 and nothing outside", async () => {
    const database = prepareDatabase([
      {
        id: "day0-exact",
        accountId: "acc-day0-exact",
        endsAt: new Date("2026-11-20T00:00:00Z"),
      },
      {
        id: "day0-late",
        accountId: "acc-day0-late",
        endsAt: new Date("2026-11-20T23:59:59Z"),
      },
      {
        id: "day1-exact",
        accountId: "acc-day1-exact",
        endsAt: new Date("2026-11-21T00:00:00Z"),
      },
      {
        id: "day1-late",
        accountId: "acc-day1-late",
        endsAt: new Date("2026-11-21T23:59:59Z"),
      },
      {
        id: "day2-exact",
        accountId: "acc-day2-exact",
        endsAt: new Date("2026-11-22T00:00:00Z"),
      },
      {
        id: "day2-late",
        accountId: "acc-day2-late",
        endsAt: new Date("2026-11-22T23:59:59Z"),
      },
      {
        id: "day7-exact",
        accountId: "acc-day7-exact",
        endsAt: new Date("2026-11-27T00:00:00Z"),
      },
      {
        id: "day7-late",
        accountId: "acc-day7-late",
        endsAt: new Date("2026-11-27T23:59:59Z"),
      },
      {
        id: "yesterday",
        accountId: "acc-yesterday",
        endsAt: new Date("2026-11-19T23:59:59Z"),
      },
      {
        id: "day8-exact",
        accountId: "acc-day8-exact",
        endsAt: new Date("2026-11-28T00:00:00Z"),
      },
      {
        id: "day8-late",
        accountId: "acc-day8-late",
        endsAt: new Date("2026-11-28T23:59:59Z"),
      },
    ]);

    const repository = new D1SubscriptionRepository(createD1Adapter(database));

    const candidates = await repository.listReminderCandidates(NOW, 100);

    expect(candidates.map((subscription) => subscription.id)).toEqual([
      "day0-exact",
      "day0-late",
      "day1-exact",
      "day1-late",
      "day2-exact",
      "day2-late",
      "day7-exact",
      "day7-late",
    ]);
  });

  it("drops the reminder already sent for its window and keeps the other branch", async () => {
    const database = prepareDatabase([
      {
        id: "day5-7d-sent",
        accountId: "acc-1",
        endsAt: new Date("2026-11-25T12:00:00Z"),
        reminders: [{ type: "renewal_7d" }],
      },
      {
        id: "day5-1d-sent",
        accountId: "acc-2",
        endsAt: new Date("2026-11-25T12:00:00Z"),
        reminders: [{ type: "renewal_1d" }],
      },
      {
        id: "day1-1d-sent",
        accountId: "acc-3",
        endsAt: new Date("2026-11-21T12:00:00Z"),
        reminders: [{ type: "renewal_1d" }],
      },
      {
        id: "day1-7d-sent",
        accountId: "acc-4",
        endsAt: new Date("2026-11-21T12:00:00Z"),
        reminders: [{ type: "renewal_7d" }],
      },
      {
        id: "day0-both-sent",
        accountId: "acc-5",
        endsAt: new Date("2026-11-20T12:00:00Z"),
        reminders: [{ type: "renewal_7d" }, { type: "renewal_1d" }],
      },
    ]);

    const repository = new D1SubscriptionRepository(createD1Adapter(database));

    const candidates = await repository.listReminderCandidates(NOW, 100);

    expect(candidates.map((subscription) => subscription.id)).toEqual([
      "day1-7d-sent",
      "day5-1d-sent",
    ]);
  });

  it("returns the subscriptions behind a full batch once the earlier ones are reminded", async () => {
    const endsAt = new Date("2026-11-25T12:00:00Z");
    const database = prepareDatabase(
      Array.from({ length: 6 }, (_, index) => ({
        id: `late-${index + 1}`,
        accountId: `acc-late-${index + 1}`,
        endsAt,
      })),
    );
    const repository = new D1SubscriptionRepository(createD1Adapter(database));

    const first = await repository.listReminderCandidates(NOW, 5);

    expect(first.map((subscription) => subscription.id)).toEqual([
      "late-1",
      "late-2",
      "late-3",
      "late-4",
      "late-5",
    ]);

    for (const subscription of first) {
      database
        .prepare(
          "INSERT INTO subscription_reminders (id, subscription_id, type, period_ends_at, sent_at) VALUES (?, ?, 'renewal_7d', ?, ?)",
        )
        .run(
          `sent-${subscription.id}`,
          subscription.id,
          toEpoch(subscription.endsAt ?? NOW),
          toEpoch(NOW),
        );
    }

    const second = await repository.listReminderCandidates(NOW, 5);

    expect(second.map((subscription) => subscription.id)).toEqual(["late-6"]);
  });

  it("does not starve the sixth subscription in the one-day window", async () => {
    const endsAt = new Date("2026-11-21T12:00:00Z");
    const database = prepareDatabase(
      Array.from({ length: 6 }, (_, index) => ({
        id: `soon-${index + 1}`,
        accountId: `acc-soon-${index + 1}`,
        endsAt,
      })),
    );
    const repository = new D1SubscriptionRepository(createD1Adapter(database));

    const first = await repository.listReminderCandidates(NOW, 5);

    expect(first.map((subscription) => subscription.id)).toEqual([
      "soon-1",
      "soon-2",
      "soon-3",
      "soon-4",
      "soon-5",
    ]);

    for (const subscription of first) {
      database
        .prepare(
          "INSERT INTO subscription_reminders (id, subscription_id, type, period_ends_at, sent_at) VALUES (?, ?, 'renewal_1d', ?, ?)",
        )
        .run(
          `sent-${subscription.id}`,
          subscription.id,
          toEpoch(subscription.endsAt ?? NOW),
          toEpoch(NOW),
        );
    }

    const second = await repository.listReminderCandidates(NOW, 5);

    expect(second.map((subscription) => subscription.id)).toEqual(["soon-6"]);
  });

  it("keeps a subscription when its reminder belongs to a previous period", async () => {
    const endsAt = new Date("2026-11-25T12:00:00Z");
    const database = prepareDatabase([
      {
        id: "renewed",
        accountId: "acc-renewed",
        endsAt,
        reminders: [{ type: "renewal_7d", periodEndsAt: new Date("2026-10-25T12:00:00Z") }],
      },
    ]);
    const repository = new D1SubscriptionRepository(createD1Adapter(database));

    const candidates = await repository.listReminderCandidates(NOW, 10);

    expect(candidates.map((subscription) => subscription.id)).toEqual(["renewed"]);
  });

  it("keeps previous-period reminders in both the 7-day and 1-day branches", async () => {
    const database = prepareDatabase([
      {
        id: "day5-prev-7d",
        accountId: "acc-1",
        endsAt: new Date("2026-11-25T12:00:00Z"),
        reminders: [{ type: "renewal_7d", periodEndsAt: new Date("2026-10-25T12:00:00Z") }],
      },
      {
        id: "day1-prev-1d",
        accountId: "acc-2",
        endsAt: new Date("2026-11-21T12:00:00Z"),
        reminders: [{ type: "renewal_1d", periodEndsAt: new Date("2026-10-21T12:00:00Z") }],
      },
    ]);
    const repository = new D1SubscriptionRepository(createD1Adapter(database));

    const candidates = await repository.listReminderCandidates(NOW, 10);

    expect(candidates.map((subscription) => subscription.id)).toEqual([
      "day1-prev-1d",
      "day5-prev-7d",
    ]);
  });

  it("does not let previous-period reminders starve the sixth subscription", async () => {
    const endsAt = new Date("2026-11-25T12:00:00Z");
    const database = prepareDatabase(
      Array.from({ length: 6 }, (_, index) => ({
        id: `old-${index + 1}`,
        accountId: `acc-old-${index + 1}`,
        endsAt,
        reminders: [
          { type: "renewal_7d" as const, periodEndsAt: new Date("2026-10-25T12:00:00Z") },
        ],
      })),
    );
    const repository = new D1SubscriptionRepository(createD1Adapter(database));

    const first = await repository.listReminderCandidates(NOW, 5);

    expect(first.map((subscription) => subscription.id)).toEqual([
      "old-1",
      "old-2",
      "old-3",
      "old-4",
      "old-5",
    ]);

    for (const subscription of first) {
      database
        .prepare(
          "INSERT INTO subscription_reminders (id, subscription_id, type, period_ends_at, sent_at) VALUES (?, ?, 'renewal_7d', ?, ?)",
        )
        .run(
          `sent-${subscription.id}`,
          subscription.id,
          toEpoch(subscription.endsAt ?? NOW),
          toEpoch(NOW),
        );
    }

    const second = await repository.listReminderCandidates(NOW, 5);

    expect(second.map((subscription) => subscription.id)).toEqual(["old-6"]);
  });
});
