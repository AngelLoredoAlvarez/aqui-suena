import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import worker, { type WorkerEnv } from "@aqui-suena/api/server/worker";
import { describe, expect, it } from "vitest";

function makeDb() {
  const calls: { sql: string; params: unknown[] }[] = [];

  const db = {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        run: async () => {
          calls.push({ sql, params });
          return { success: true };
        },
        all: async () => ({ results: [] }),
        first: async () => null,
      }),
      all: async () => ({ results: [] }),
      first: async () => null,
    }),
  } as unknown as D1Database;

  return { db, calls };
}

function seedRequest(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token !== undefined) headers.authorization = `Bearer ${token}`;

  return new Request("https://worker.test/admin/seed-plans", { method: "POST", headers });
}

describe("POST /admin/seed-plans", () => {
  it("answers 404 when the admin token is not configured", async () => {
    const { db, calls } = makeDb();
    const response = await worker.fetch(seedRequest("secret"), {
      aqui_suena_db: db,
    } as unknown as WorkerEnv);

    expect(response.status).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it("answers 404 when the token does not match", async () => {
    const { db, calls } = makeDb();
    const response = await worker.fetch(seedRequest("wrong"), {
      aqui_suena_db: db,
      ADMIN_TOKEN: "secret",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it("seeds every plan with the matching token", async () => {
    const { db, calls } = makeDb();
    const response = await worker.fetch(seedRequest("secret"), {
      aqui_suena_db: db,
      ADMIN_TOKEN: "secret",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ seeded: DEFAULT_PLAN_CATALOG.length });
    expect(calls).toHaveLength(DEFAULT_PLAN_CATALOG.length);
    expect(calls[0]?.sql).toContain("ON CONFLICT(id) DO UPDATE");
  });
});
