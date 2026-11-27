import { runArchiveRecovery } from "@aqui-suena/api/server/jobs/archive-recovery";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runArchiveRecovery", () => {
  it("resolves without throwing when invoicing is unconfigured", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const env = { aqui_suena_db: new FakeD1Database().db } as unknown as WorkerEnv;

    await expect(runArchiveRecovery(env)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      "worker: archive recovery skipped, invoicing is unconfigured",
    );
  });
});
