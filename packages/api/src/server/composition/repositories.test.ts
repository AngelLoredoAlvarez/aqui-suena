import {
  createD1Repositories,
  createInMemoryRepositories,
} from "@aqui-suena/api/server/composition/repositories";
import { describe, expect, it } from "vitest";

const EXPECTED_KEYS = [
  "business",
  "flyer",
  "hour",
  "media",
  "photo",
  "product",
  "service",
  "subscription",
  "workEntry",
].sort();

describe("repository composition", () => {
  it("builds every in-memory repository", () => {
    const repositories = createInMemoryRepositories();

    expect(Object.keys(repositories).sort()).toEqual(EXPECTED_KEYS);
    for (const value of Object.values(repositories)) {
      expect(value).toBeDefined();
    }
  });

  it("builds the same set of D1 repositories", () => {
    const db = {} as D1Database;
    const repositories = createD1Repositories(db);

    expect(Object.keys(repositories).sort()).toEqual(EXPECTED_KEYS);
    for (const value of Object.values(repositories)) {
      expect(value).toBeDefined();
    }
  });
});
