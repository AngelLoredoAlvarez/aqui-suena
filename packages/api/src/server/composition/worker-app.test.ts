import { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-object-storage";
import { createWorkerApp, createWorkerCore } from "@aqui-suena/api/server/composition/worker-app";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

function env(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return { aqui_suena_db: new FakeD1Database().db, ...overrides } as unknown as WorkerEnv;
}

describe("createWorkerCore", () => {
  it("omits the embedding model, vector index and media storage without bindings", () => {
    const core = createWorkerCore(env());

    expect(core.embeddingModel).toBeUndefined();
    expect(core.vectorIndex).toBeUndefined();
    expect(core.mediaStorage).toBeUndefined();
  });

  it("always wires the plan and directory repositories", () => {
    const core = createWorkerCore(env());

    expect(core.planRepository).toBeDefined();
    expect(core.directoryRepositories).toBeDefined();
  });

  it("wires media storage when R2 credentials are present", () => {
    const core = createWorkerCore(
      env({
        R2_ACCOUNT_ID: "acc",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret",
      }),
    );

    expect(core.mediaStorage).toBeInstanceOf(R2ObjectStorage);
  });
});

describe("createWorkerApp", () => {
  it("composes an app that reports media as unconfigured without R2", async () => {
    const workerEnv = env();
    const app = createWorkerApp(workerEnv, createWorkerCore(workerEnv));

    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", media: "unconfigured" });
  });
});
