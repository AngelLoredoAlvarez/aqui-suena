import {
  accountPreferences,
  accounts,
  businesses,
  cfdiInvoices,
  flyers,
  hours,
  listenSessions,
  paymentEvents,
  payments,
  photos,
  plans,
  products,
  services,
  stations,
  subscriptions,
  workEntries,
} from "@aqui-suena/db/schema";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";

function columnNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).columns.map((column) => column.name);
}

function indexColumns(table: Parameters<typeof getTableConfig>[0], indexName: string): string[] {
  const config = getTableConfig(table).indexes.find(
    (entry) => entry.config.name === indexName,
  )?.config;

  return (config?.columns ?? []).map((column) => ("name" in column ? column.name : "sql"));
}

describe("cron query indexes", () => {
  it("indexes the filters every scheduled sweep reads", () => {
    expect(indexColumns(cfdiInvoices, "cfdi_invoices_status_updated_idx")).toEqual([
      "status",
      "updated_at",
    ]);
    expect(indexColumns(payments, "payments_status_created_idx")).toEqual(["status", "created_at"]);
    expect(indexColumns(payments, "payments_subscription_created_idx")).toEqual([
      "subscription_id",
      "created_at",
    ]);
    expect(indexColumns(subscriptions, "subscriptions_status_ends_idx")).toEqual([
      "status",
      "ends_at",
    ]);
    expect(indexColumns(subscriptions, "subscriptions_status_grace_idx")).toEqual([
      "status",
      "grace_end",
    ]);
    expect(indexColumns(subscriptions, "subscriptions_account_status_idx")).toEqual([
      "account_id",
      "status",
    ]);
    expect(indexColumns(businesses, "businesses_account_idx")).toEqual(["account_id"]);
  });
});

describe("directory foreign keys", () => {
  it("cascades business children when a business is deleted", () => {
    for (const table of [services, workEntries, products, photos, flyers, hours]) {
      const foreignKeys = getTableConfig(table).foreignKeys.filter(
        (foreignKey) => foreignKey.reference().foreignTable === businesses,
      );

      expect(foreignKeys.length).toBeGreaterThan(0);
      for (const foreignKey of foreignKeys) {
        expect(foreignKey.onDelete).toBe("cascade");
      }
    }
  });

  it("cascades a photo when its work entry or product is deleted", () => {
    const foreignKeys = getTableConfig(photos).foreignKeys;
    const workEntry = foreignKeys.find(
      (foreignKey) => foreignKey.reference().foreignTable === workEntries,
    );
    const product = foreignKeys.find(
      (foreignKey) => foreignKey.reference().foreignTable === products,
    );

    expect(workEntry?.onDelete).toBe("cascade");
    expect(product?.onDelete).toBe("cascade");
  });
});

describe("stations", () => {
  it("exposes id, name and stream url columns", () => {
    expect(columnNames(stations)).toEqual(expect.arrayContaining(["id", "name", "stream_url"]));
  });
});

describe("listenSessions", () => {
  it("exposes id, station reference, timestamps and listener count", () => {
    expect(columnNames(listenSessions)).toEqual(
      expect.arrayContaining(["id", "station_id", "started_at", "ended_at", "listeners"]),
    );
  });
});

describe("businesses", () => {
  it("exposes id, account reference, name, category, phone, email, address, timezone, delivery, visibility/retention and timestamps", () => {
    expect(columnNames(businesses)).toEqual(
      expect.arrayContaining([
        "id",
        "account_id",
        "name",
        "category",
        "phone",
        "email",
        "address",
        "timezone",
        "delivery",
        "hidden_at",
        "retained_until",
        "created_at",
        "updated_at",
      ]),
    );
  });
});

describe("products", () => {
  it("exposes id, business reference, name, description and price", () => {
    expect(columnNames(products)).toEqual(
      expect.arrayContaining(["id", "business_id", "name", "description", "price"]),
    );
  });
});

describe("photos", () => {
  it("exposes id, business reference, optional work entry reference, optional product reference, kind and url", () => {
    expect(columnNames(photos)).toEqual(
      expect.arrayContaining(["id", "business_id", "work_entry_id", "product_id", "kind", "url"]),
    );
  });
});

describe("hours", () => {
  it("exposes id, business reference, day and open/close minutes", () => {
    expect(columnNames(hours)).toEqual(
      expect.arrayContaining(["id", "business_id", "day", "open_minute", "close_minute"]),
    );
  });
});

describe("accounts", () => {
  it("exposes identity, plan, billing and timestamp columns", () => {
    expect(columnNames(accounts)).toEqual(
      expect.arrayContaining([
        "id",
        "email",
        "plan_id",
        "conekta_customer_id",
        "default_card_source_id",
        "card_brand",
        "card_last4",
        "card_exp_month",
        "card_exp_year",
        "created_at",
        "updated_at",
      ]),
    );
  });
});

describe("account_preferences", () => {
  it("exposes the account reference, locale, renewal reminders and update time", () => {
    expect(columnNames(accountPreferences)).toEqual(
      expect.arrayContaining(["account_id", "locale", "renewal_reminders_enabled", "updated_at"]),
    );
  });
});

describe("cfdi_invoices", () => {
  it("exposes the cancellation audit fields and the substitution UUID", () => {
    expect(columnNames(cfdiInvoices)).toEqual(
      expect.arrayContaining(["status", "cancellation_motive", "acuse_key", "substitution_uuid"]),
    );
  });
});

describe("plans", () => {
  it("exposes id, name, audience, description, benefits, prices, currency, active flag and timestamps", () => {
    expect(columnNames(plans)).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "audience",
        "description",
        "benefits",
        "price_monthly",
        "price_annual",
        "currency",
        "active",
        "created_at",
        "updated_at",
      ]),
    );
  });
});

describe("subscriptions", () => {
  it("exposes id, account reference, plan reference, billing interval, status, period timestamps and grace end", () => {
    expect(columnNames(subscriptions)).toEqual(
      expect.arrayContaining([
        "id",
        "account_id",
        "plan_id",
        "billing_interval",
        "status",
        "started_at",
        "ends_at",
        "grace_end",
        "created_at",
        "updated_at",
      ]),
    );
  });
});

describe("payments", () => {
  it("exposes the checkout intent, provider, period and idempotency columns", () => {
    expect(columnNames(payments)).toEqual(
      expect.arrayContaining([
        "id",
        "account_id",
        "subscription_id",
        "plan_id",
        "billing_interval",
        "method",
        "provider",
        "provider_order_id",
        "provider_charge_id",
        "idempotency_key",
        "amount",
        "currency",
        "status",
        "reference",
        "next_action_url",
        "expires_at",
        "failure_reason",
        "period_start",
        "period_end",
        "paid_at",
        "created_at",
        "updated_at",
      ]),
    );
  });
});

describe("paymentEvents", () => {
  it("exposes provider event identity, type, payment reference and processing state", () => {
    expect(columnNames(paymentEvents)).toEqual(
      expect.arrayContaining([
        "id",
        "provider_event_id",
        "type",
        "payment_id",
        "payload_hash",
        "livemode",
        "processed_at",
        "created_at",
      ]),
    );
  });
});

describe("services", () => {
  it("exposes id, business reference, name, description, base price and timestamps", () => {
    expect(columnNames(services)).toEqual(
      expect.arrayContaining([
        "id",
        "business_id",
        "name",
        "description",
        "base_price",
        "created_at",
        "updated_at",
      ]),
    );
  });
});

describe("workEntries", () => {
  it("exposes id, business reference, title, description and timestamps", () => {
    expect(columnNames(workEntries)).toEqual(
      expect.arrayContaining([
        "id",
        "business_id",
        "title",
        "description",
        "created_at",
        "updated_at",
      ]),
    );
  });
});

describe("flyers", () => {
  it("exposes id, business reference, url, replaced at and timestamps", () => {
    expect(columnNames(flyers)).toEqual(
      expect.arrayContaining([
        "id",
        "business_id",
        "url",
        "replaced_at",
        "created_at",
        "updated_at",
      ]),
    );
  });
});
