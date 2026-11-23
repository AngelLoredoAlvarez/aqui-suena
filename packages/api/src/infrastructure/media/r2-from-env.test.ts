import {
  createR2StorageFromEnv,
  hasPartialR2Config,
  r2OptionsFromEnv,
} from "@aqui-suena/api/infrastructure/media/r2-from-env";
import { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-object-storage";
import { describe, expect, it } from "vitest";

const completeEnv = {
  R2_ACCOUNT_ID: " account ",
  R2_ACCESS_KEY_ID: " access ",
  R2_SECRET_ACCESS_KEY: " secret ",
  R2_BUCKET_NAME: " aqui-suena-media-dev ",
  R2_ENDPOINT: " https://example.r2.cloudflarestorage.com ",
};

describe("r2OptionsFromEnv", () => {
  it("returns trimmed options when all credentials are present", () => {
    expect(r2OptionsFromEnv(completeEnv)).toEqual({
      accountId: "account",
      accessKeyId: "access",
      secretAccessKey: "secret",
      bucketName: "aqui-suena-media-dev",
      endpoint: "https://example.r2.cloudflarestorage.com",
    });
  });

  it("defaults the bucket name when it is absent or blank", () => {
    expect(r2OptionsFromEnv({ ...completeEnv, R2_BUCKET_NAME: "" })?.bucketName).toBe(
      "aqui-suena-media",
    );
  });

  it("returns null when any credential is missing", () => {
    expect(r2OptionsFromEnv({ ...completeEnv, R2_SECRET_ACCESS_KEY: "" })).toBeNull();
  });
});

describe("hasPartialR2Config", () => {
  it("is false for an empty or complete configuration", () => {
    expect(hasPartialR2Config({})).toBe(false);
    expect(hasPartialR2Config(completeEnv)).toBe(false);
  });

  it("is true when only some credentials are present", () => {
    expect(hasPartialR2Config({ R2_ACCOUNT_ID: "account" })).toBe(true);
  });
});

describe("createR2StorageFromEnv", () => {
  it("builds the R2 adapter only with complete credentials", () => {
    expect(createR2StorageFromEnv(completeEnv)).toBeInstanceOf(R2ObjectStorage);
    expect(createR2StorageFromEnv({})).toBeUndefined();
  });
});
