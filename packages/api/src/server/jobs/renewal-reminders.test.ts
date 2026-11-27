import { runRenewalReminders } from "@aqui-suena/api/server/jobs/renewal-reminders";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runRenewalReminders", () => {
  it("resolves without throwing when email is unconfigured", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const env = { aqui_suena_db: new FakeD1Database().db } as unknown as WorkerEnv;

    await expect(runRenewalReminders(env)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith("worker: renewal reminders skipped, email is unconfigured");
  });
});
