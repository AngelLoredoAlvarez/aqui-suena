import { D1StationCatalogWriter } from "@aqui-suena/api/infrastructure/radio/d1-station-catalog-writer";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

describe("D1StationCatalogWriter", () => {
  it("emits an idempotent upsert with the station fields", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const writer = new D1StationCatalogWriter(fake.db);

    await writer.upsert({
      id: "test-pop",
      name: "Test Pop",
      streamUrl: "https://web.test/test-streams/test-pop.m4a",
    });

    const statement = fake.statements[0];

    expect(statement?.sql).toContain("INSERT INTO stations");
    expect(statement?.sql).toContain("ON CONFLICT(id) DO UPDATE");
    expect(statement?.sql).toContain("stream_url = excluded.stream_url");
    expect(statement?.params).toEqual([
      "test-pop",
      "Test Pop",
      "https://web.test/test-streams/test-pop.m4a",
      expect.any(Number),
    ]);
  });
});
