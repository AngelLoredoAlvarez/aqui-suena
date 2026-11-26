import { MEDIA_SWEEP_CRON, runMediaMaintenance } from "@aqui-suena/api/server/jobs/media-sweep";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MEDIA_SWEEP_CRON", () => {
  it("runs daily at 3 am", () => {
    expect(MEDIA_SWEEP_CRON).toBe("0 3 * * *");
  });
});

describe("runMediaMaintenance", () => {
  it("resolves without throwing when media storage is unconfigured", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(runMediaMaintenance({} as unknown as WorkerEnv)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      "worker: media maintenance skipped, media storage is unconfigured",
    );
  });
});
