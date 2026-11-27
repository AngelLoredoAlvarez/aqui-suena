import { runCancellationSweep } from "@aqui-suena/api/server/jobs/cancellation-sweep";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runCancellationSweep", () => {
  it("resolves without throwing when invoicing is unconfigured", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const env = { aqui_suena_db: new FakeD1Database().db } as unknown as WorkerEnv;

    await expect(runCancellationSweep(env)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      "worker: cancellation sweep skipped, invoicing is unconfigured",
    );
  });
});
