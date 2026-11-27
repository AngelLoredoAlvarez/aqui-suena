import { InMemoryPlanRepository } from "@aqui-suena/api/infrastructure/memory/plans/in-memory-plan-repository";
import { createInMemoryRepositories } from "@aqui-suena/api/server/composition/repositories";
import type { WorkerCore } from "@aqui-suena/api/server/composition/worker-app";
import { handleAdminRequest } from "@aqui-suena/api/server/http/admin-routes";
import type { AiBinding } from "@aqui-suena/api/server/routers/support";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";
import { describe, expect, it } from "vitest";

function fakeCore(overrides: Partial<WorkerCore> = {}): WorkerCore {
  return {
    ai: {} as AiBinding,
    gatewayId: undefined,
    embeddingModel: undefined,
    vectorIndex: undefined,
    planRepository: new InMemoryPlanRepository([]),
    directoryRepositories: createInMemoryRepositories(),
    mediaStorage: undefined,
    ...overrides,
  };
}

describe("handleAdminRequest", () => {
  it("returns undefined for non-admin paths", async () => {
    const response = await handleAdminRequest(
      new Request("https://worker.test/health"),
      {} as unknown as WorkerEnv,
      fakeCore(),
    );

    expect(response).toBeUndefined();
  });

  it("rate limits /admin/ requests", async () => {
    const limiter = { limit: async () => ({ success: false }) };
    const response = await handleAdminRequest(
      new Request("https://worker.test/admin/seed-plans"),
      { RATE_LIMITER: limiter } as unknown as WorkerEnv,
      fakeCore(),
    );

    expect(response?.status).toBe(429);
  });

  it("answers 404 for an admin path without a matching token instead of falling through", async () => {
    const response = await handleAdminRequest(
      new Request("https://worker.test/admin/seed-stations"),
      { ADMIN_TOKEN: "secret" } as unknown as WorkerEnv,
      fakeCore(),
    );

    expect(response).toBeDefined();
    expect(response?.status).toBe(404);
  });

  it("returns 404 for /admin/seed-vectors without a matching token", async () => {
    const core = fakeCore({
      embeddingModel: { model: "test", embed: async () => [] } as never,
      vectorIndex: { query: async () => [], upsert: async () => {} } as never,
    });

    const response = await handleAdminRequest(
      new Request("https://worker.test/admin/seed-vectors", {
        headers: { authorization: "Bearer wrong" },
      }),
      { ADMIN_TOKEN: "secret" } as unknown as WorkerEnv,
      core,
    );

    expect(response?.status).toBe(404);
  });

  it("skips /admin/seed-vectors when the embedding model or index is missing", async () => {
    const response = await handleAdminRequest(
      new Request("https://worker.test/admin/seed-vectors", {
        headers: { authorization: "Bearer secret" },
      }),
      { ADMIN_TOKEN: "secret" } as unknown as WorkerEnv,
      fakeCore(),
    );

    expect(response).toBeUndefined();
  });

  it("proceeds with /admin/seed-vectors when the vector plumbing is present", async () => {
    const core = fakeCore({
      embeddingModel: { model: "test", embed: async () => [] } as never,
      vectorIndex: { query: async () => [], upsert: async () => {} } as never,
    });

    const response = await handleAdminRequest(
      new Request("https://worker.test/admin/seed-vectors", {
        headers: { authorization: "Bearer secret" },
      }),
      { ADMIN_TOKEN: "secret" } as unknown as WorkerEnv,
      core,
    );

    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ seeded: 0 });
  });
});
