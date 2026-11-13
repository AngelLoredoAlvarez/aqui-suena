import { D1StationRepository } from "@aqui-suena/api/infrastructure/radio/d1-station-repository";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "aqui-suena-pop",
  name: "Aquí Suena Pop",
  stream_url: "https://web.test/test-streams/aqui-suena-pop.m4a",
};

describe("D1StationRepository", () => {
  it("maps a station row", async () => {
    const fake = new FakeD1Database(() => ({ first: sampleRow }));
    const repository = new D1StationRepository(fake.db);

    const station = await repository.getById("aqui-suena-pop");

    expect(station).toEqual({
      id: "aqui-suena-pop",
      name: "Aquí Suena Pop",
      streamUrl: "https://web.test/test-streams/aqui-suena-pop.m4a",
    });
    expect(fake.statements[0]?.params).toEqual(["aqui-suena-pop"]);
  });

  it("returns null for an unknown station", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repository = new D1StationRepository(fake.db);

    expect(await repository.getById("missing")).toBeNull();
  });

  it("lists every station", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1StationRepository(fake.db);

    expect(await repository.list()).toEqual([
      {
        id: "aqui-suena-pop",
        name: "Aquí Suena Pop",
        streamUrl: "https://web.test/test-streams/aqui-suena-pop.m4a",
      },
    ]);
  });
});
