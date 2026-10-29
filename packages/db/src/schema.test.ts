import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { businesses, hours, listenSessions, photos, products, stations } from "./schema";

function columnNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).columns.map((column) => column.name);
}

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
  it("exposes id, name, category, phone, email, address, timezone, delivery and timestamps", () => {
    expect(columnNames(businesses)).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "category",
        "phone",
        "email",
        "address",
        "timezone",
        "delivery",
        "created_at",
        "updated_at",
      ]),
    );
  });
});

describe("products", () => {
  it("exposes id, business reference, name and price", () => {
    expect(columnNames(products)).toEqual(
      expect.arrayContaining(["id", "business_id", "name", "price"]),
    );
  });
});

describe("photos", () => {
  it("exposes id, business reference, kind and url", () => {
    expect(columnNames(photos)).toEqual(
      expect.arrayContaining(["id", "business_id", "kind", "url"]),
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
