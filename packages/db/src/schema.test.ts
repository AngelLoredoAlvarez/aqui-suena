import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import {
  accounts,
  businesses,
  flyers,
  hours,
  listenSessions,
  photos,
  plans,
  products,
  services,
  stations,
  subscriptions,
  workEntries,
} from "./schema";

function columnNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).columns.map((column) => column.name);
}

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
  it("exposes id, email, plan, locale and timestamps", () => {
    expect(columnNames(accounts)).toEqual(
      expect.arrayContaining(["id", "email", "plan_id", "locale", "created_at", "updated_at"]),
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
  it("exposes id, account reference, plan reference, status, period timestamps and grace end", () => {
    expect(columnNames(subscriptions)).toEqual(
      expect.arrayContaining([
        "id",
        "account_id",
        "plan_id",
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
