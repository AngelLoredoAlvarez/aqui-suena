import { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-object-storage";
import {
  facturamaEnv,
  mediaStorageFromEnv,
  r2Env,
} from "@aqui-suena/api/server/composition/env-mappers";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("facturamaEnv", () => {
  it("passes through the PAC credentials and fiscal fields", () => {
    const env = {
      FACTURAMA_USER: "user",
      FACTURAMA_PASSWORD: "pass",
      FACTURAMA_BASE_URL: "https://apisandbox.facturama.mx",
      FACTURAMA_EXPEDITION_PLACE: "42501",
    } as unknown as WorkerEnv;

    expect(facturamaEnv(env)).toMatchObject({
      user: "user",
      password: "pass",
      baseUrl: "https://apisandbox.facturama.mx",
      expeditionPlace: "42501",
    });
  });

  it("maps multiemisor mode and defaults everything else to web", () => {
    expect(facturamaEnv({ FACTURAMA_MODE: "multiemisor" } as unknown as WorkerEnv).mode).toBe(
      "multiemisor",
    );
    expect(facturamaEnv({ FACTURAMA_MODE: "web" } as unknown as WorkerEnv).mode).toBe("web");
    expect(facturamaEnv({} as unknown as WorkerEnv).mode).toBe("web");
  });

  it("parses the IVA rate and leaves it undefined when absent", () => {
    expect(facturamaEnv({ FACTURAMA_IVA_RATE: "0.16" } as unknown as WorkerEnv).ivaRate).toBe(0.16);
    expect(facturamaEnv({} as unknown as WorkerEnv).ivaRate).toBeUndefined();
  });
});

describe("r2Env", () => {
  it("passes through every R2 field", () => {
    const env = {
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET_NAME: "bucket",
      R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
    } as unknown as WorkerEnv;

    expect(r2Env(env)).toEqual({
      accountId: "acc",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucketName: "bucket",
      endpoint: "https://example.r2.cloudflarestorage.com",
    });
  });
});

describe("mediaStorageFromEnv", () => {
  it("returns undefined when R2 is absent", () => {
    expect(mediaStorageFromEnv({} as unknown as WorkerEnv)).toBeUndefined();
  });

  it("returns undefined when R2 is only partially configured", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(mediaStorageFromEnv({ R2_ACCOUNT_ID: "acc" } as unknown as WorkerEnv)).toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("incomplete R2 configuration"));
  });

  it("builds R2 storage when the credentials are complete", () => {
    const storage = mediaStorageFromEnv({
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
    } as unknown as WorkerEnv);

    expect(storage).toBeInstanceOf(R2ObjectStorage);
  });
});
