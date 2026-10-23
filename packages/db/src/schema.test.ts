import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";

import { listenSessions, stations } from "./schema";

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
