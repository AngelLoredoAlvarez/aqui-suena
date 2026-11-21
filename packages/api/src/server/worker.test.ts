import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import worker, { type WorkerEnv } from "@aqui-suena/api/server/worker";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { normalizeSql } from "@aqui-suena/api/testing/sql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let infoLog: ReturnType<typeof vi.spyOn>;
let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  infoLog = vi.spyOn(console, "log").mockImplementation(() => {});
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  infoLog.mockRestore();
  errorLog.mockRestore();
  vi.unstubAllGlobals();
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

function seedStationsRequest(token?: string): Request {
  const headers: Record<string, string> = {};

  if (token !== undefined) headers.authorization = `Bearer ${token}`;

  return new Request("https://worker.test/admin/seed-stations", { method: "POST", headers });
}

describe("POST /admin/seed-stations", () => {
  it("answers 404 when the admin token is not configured", async () => {
    const { db, statements } = makeDb();
    const response = await worker.fetch(seedStationsRequest("secret"), {
      aqui_suena_db: db,
    } as unknown as WorkerEnv);

    expect(response.status).toBe(404);
    expect(statements).toHaveLength(0);
  });

  it("answers 404 when the token does not match", async () => {
    const { db, statements } = makeDb();
    const response = await worker.fetch(seedStationsRequest("wrong"), {
      aqui_suena_db: db,
      ADMIN_TOKEN: "secret",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(404);
    expect(statements).toHaveLength(0);
  });

  it("refuses to seed without STREAM_BASE_URL", async () => {
    const { db, statements } = makeDb();
    const response = await worker.fetch(seedStationsRequest("secret"), {
      aqui_suena_db: db,
      ADMIN_TOKEN: "secret",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(400);
    expect(statements).toHaveLength(0);
  });

  it("upserts the three harness stations with the configured base URL", async () => {
    const { db, statements } = makeDb();
    const response = await worker.fetch(seedStationsRequest("secret"), {
      aqui_suena_db: db,
      ADMIN_TOKEN: "secret",
      STREAM_BASE_URL: "https://web.test",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ seeded: 3 });
    expect(statements).toHaveLength(3);
    expect(normalizeSql(statements[0]?.sql)).toContain("ON CONFLICT(id) DO UPDATE");
    expect(statements[0]?.params[2]).toBe("https://web.test/test-streams/aqui-suena-pop.m4a");
  });
});

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
    expect(normalizeSql(statements[0]?.sql)).toContain("ON CONFLICT(id) DO UPDATE");
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

describe("scheduled sweep", () => {
  function invoicingEnv(): Record<string, unknown> {
    return {
      FACTURAMA_USER: "user",
      FACTURAMA_PASSWORD: "pass",
      FACTURAMA_BASE_URL: "https://apisandbox.facturama.mx",
      FACTURAMA_MODE: "multiemisor",
      FACTURAMA_EXPEDITION_PLACE: "42501",
      FACTURAMA_ISSUER_RFC: "EKU9003173C9",
      FACTURAMA_ISSUER_NAME: "ESCUELA KEMPER URGATE",
      FACTURAMA_ISSUER_FISCAL_REGIME: "601",
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
    };
  }

  it("does nothing instead of throwing when invoicing is unconfigured", async () => {
    const db = new FakeD1Database();

    await expect(
      worker.scheduled?.(
        { cron: "*/15 * * * *" } as never,
        {
          aqui_suena_db: db.db,
        } as unknown as WorkerEnv,
      ),
    ).resolves.toBeUndefined();

    expect(errorLog).toHaveBeenCalledWith(
      "worker: cancellation sweep skipped, invoicing is unconfigured",
    );
    expect(errorLog).toHaveBeenCalledWith(
      "worker: archive recovery skipped, invoicing is unconfigured",
    );
    expect(errorLog).toHaveBeenCalledWith(
      "worker: payment sweeps skipped, Conekta is unconfigured",
    );
  });

  it("skips the daily media maintenance when storage is unconfigured", async () => {
    await expect(
      worker.scheduled?.({ cron: "0 3 * * *" } as never, {} as unknown as WorkerEnv),
    ).resolves.toBeUndefined();

    expect(errorLog).toHaveBeenCalledWith(
      "worker: media maintenance skipped, media storage is unconfigured",
    );
  });

  it("does not touch the database when there is nothing to cancel", async () => {
    const db = new FakeD1Database(() => ({ all: [] }));

    await worker.scheduled?.(
      { cron: "*/15 * * * *" } as never,
      {
        aqui_suena_db: db.db,
        ...invoicingEnv(),
      } as unknown as WorkerEnv,
    );

    expect(normalizeSql(db.statements[0]?.sql)).toContain("WHERE status = 'cancellation_pending'");
  });

  it("re-fetches fiscal documents that never reached storage", async () => {
    const db = new FakeD1Database(() => ({ all: [] }));

    await worker.scheduled?.(
      { cron: "*/15 * * * *" } as never,
      {
        aqui_suena_db: db.db,
        ...invoicingEnv(),
      } as unknown as WorkerEnv,
    );

    const statements = db.statements.map((statement) => normalizeSql(statement.sql));

    expect(statements.some((sql) => sql.includes("xml_key IS NULL OR pdf_key IS NULL"))).toBe(true);
  });
});

describe("admin retention purge", () => {
  function purgeRequest(token?: string): Request {
    const headers: Record<string, string> = {};

    if (token !== undefined) headers.authorization = `Bearer ${token}`;

    return new Request("https://worker.test/admin/purge-expired-businesses", { headers });
  }

  const r2Env = {
    R2_ACCOUNT_ID: "acc",
    R2_ACCESS_KEY_ID: "key",
    R2_SECRET_ACCESS_KEY: "secret",
  };

  it("answers 404 without a matching admin token", async () => {
    const { db } = makeDb();

    const response = await worker.fetch(purgeRequest("wrong"), {
      aqui_suena_db: db,
      ADMIN_TOKEN: "secret",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(404);
  });

  it("answers 503 when media storage is unconfigured", async () => {
    const { db } = makeDb();

    const response = await worker.fetch(purgeRequest("secret"), {
      aqui_suena_db: db,
      ADMIN_TOKEN: "secret",
    } as unknown as WorkerEnv);

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("media storage is not configured");
  });

  it("returns the purge counts when storage is configured", async () => {
    const db = new FakeD1Database(() => ({ all: [] }));

    const response = await worker.fetch(purgeRequest("secret"), {
      aqui_suena_db: db.db,
      ADMIN_TOKEN: "secret",
      ...r2Env,
    } as unknown as WorkerEnv);

    expect(await response.json()).toEqual({ businesses: 0, media: 0 });
  });
});

describe("daily media maintenance", () => {
  const r2Env = {
    R2_ACCOUNT_ID: "acc",
    R2_ACCESS_KEY_ID: "key",
    R2_SECRET_ACCESS_KEY: "secret",
  };

  const emptyList = "<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>";

  it("purges expired businesses and sweeps orphans without running billing jobs", async () => {
    const db = new FakeD1Database(() => ({ all: [] }));

    const fetchSpy = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(emptyList, { status: 200 }),
    );

    vi.stubGlobal("fetch", fetchSpy);

    await worker.scheduled?.(
      { cron: "0 3 * * *" } as never,
      {
        aqui_suena_db: db.db,
        ...r2Env,
      } as unknown as WorkerEnv,
    );

    const statements = db.statements.map((statement) => normalizeSql(statement.sql));

    expect(statements.some((sql) => sql.includes("retained_until"))).toBe(true);
    expect(statements.some((sql) => sql.includes("SELECT r2_key FROM media"))).toBe(true);
    expect(statements.some((sql) => sql.includes("cancellation_pending"))).toBe(false);
    expect(new URL(String(fetchSpy.mock.calls[0]?.[0])).searchParams.get("prefix")).toBe("media/");
  });

  it("does not touch storage on the fifteen-minute cron", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await worker.scheduled?.(
      { cron: "*/15 * * * *" } as never,
      {
        aqui_suena_db: new FakeD1Database().db,
        ...r2Env,
      } as unknown as WorkerEnv,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
