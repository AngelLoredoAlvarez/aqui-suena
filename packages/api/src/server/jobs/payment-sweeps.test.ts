import { runPaymentSweeps } from "@aqui-suena/api/server/jobs/payment-sweeps";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runPaymentSweeps", () => {
  it("resolves without throwing when Conekta is unconfigured", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(runPaymentSweeps({} as unknown as WorkerEnv)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith("worker: payment sweeps skipped, Conekta is unconfigured");
  });
});
