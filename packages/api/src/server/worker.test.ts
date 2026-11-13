import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import worker, { type WorkerEnv } from "@aqui-suena/api/server/worker";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let infoLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  infoLog = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  infoLog.mockRestore();
});

function makeDb() {
  const fake = new FakeD1Database(() => ({ run: { success: true } }));

  return { db: fake.db, statements: fake.statements };
}

function seedRequest(token?: string): Request {
  const headers: Record<string, string> = {};

  if (token !== undefined) headers.authorization = `Bearer ${token}`;

  return new Request("https://worker.test/admin/seed-plans", { method: "POST", headers });
}

describe("POST /admin/seed-plans", () => {
  it("answers 404 when the admin token is not configured", async () => {
    const { db, statements } = makeDb();

    const response = await worker.fetch(seedRequest("secret"), {
      aqui_suena_db: db,
    } as unknown as WorkerEnv);

    expect(response.status).toBe(404);
    expect(statements).toHaveLength(0);
  });

  it("answers 404 when the token does not match", async () => {
    const { db, statements } = makeDb();

    const response = await worker.fetch(seedRequest("wrong"), {
      aqui_suena_db: db,
      ADMIN_TOKEN: "secret",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(404);
    expect(statements).toHaveLength(0);
  });

  it("seeds every plan with the matching token", async () => {
    const { db, statements } = makeDb();

    const response = await worker.fetch(seedRequest("secret"), {
      aqui_suena_db: db,
      ADMIN_TOKEN: "secret",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ seeded: DEFAULT_PLAN_CATALOG.length });
    expect(statements).toHaveLength(DEFAULT_PLAN_CATALOG.length);
    expect(statements[0]?.sql).toContain("ON CONFLICT(id) DO UPDATE");
  });
});

describe("GET /health media wiring", () => {
  it("reports unconfigured media when no R2 credentials are present", async () => {
    const { db } = makeDb();

    const response = await worker.fetch(new Request("https://worker.test/health"), {
      aqui_suena_db: db,
    } as unknown as WorkerEnv);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", media: "unconfigured" });
  });

  it("reports configured media when all R2 credentials are present", async () => {
    const { db } = makeDb();

    const response = await worker.fetch(new Request("https://worker.test/health"), {
      aqui_suena_db: db,
      R2_ACCOUNT_ID: "account",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", media: "configured" });
  });

  it("logs partial R2 configuration and reports media unconfigured", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const { db } = makeDb();

    const response = await worker.fetch(new Request("https://worker.test/health"), {
      aqui_suena_db: db,
      R2_ACCOUNT_ID: "account",
    } as unknown as WorkerEnv);

    expect(await response.json()).toEqual({ status: "ok", media: "unconfigured" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("incomplete R2 configuration"));

    log.mockRestore();
  });
});
