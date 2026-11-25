// @vitest-environment jsdom

import { downloadFlyer } from "@aqui-suena/ui/flyer-lightbox/download-flyer.native";
import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  available: true,
  exists: false,
  shareAsync: vi.fn(async () => undefined),
  openURL: vi.fn(async () => true),
  downloadFileAsync: vi.fn(async () => ({ uri: "file:///cache/flyer-el-sazon.jpg" })),
  deleted: [] as string[],
  lastFileParts: [] as unknown[],
}));

vi.mock("expo-file-system", () => {
  class File {
    readonly uri: string;
    readonly name: string;

    constructor(...parts: unknown[]) {
      native.lastFileParts = parts;
      this.name = String(parts[1]);
      this.uri = "file:///cache/flyer-el-sazon.jpg";
    }

    get exists(): boolean {
      return native.exists;
    }

    delete(): void {
      native.deleted.push(this.name);
      native.exists = false;
    }

    static downloadFileAsync = native.downloadFileAsync;
  }

  return { File, Paths: { cache: "CACHE" } };
});

vi.mock("expo-sharing", () => ({
  isAvailableAsync: async () => native.available,
  shareAsync: native.shareAsync,
}));

vi.mock("react-native", () => ({
  Linking: { openURL: native.openURL },
}));

const URL_VALUE = "https://api.test/images/a.jpg";

describe("downloadFlyer (native)", () => {
  beforeEach(() => {
    native.available = true;
    native.exists = false;
    native.shareAsync.mockClear();
    native.openURL.mockClear();
    native.downloadFileAsync.mockClear();
    native.deleted = [];
    native.lastFileParts = [];
  });

  it("downloads into the cache and opens the share sheet", async () => {
    await downloadFlyer(URL_VALUE, "El Sazón de Ale");

    expect(native.downloadFileAsync).toHaveBeenCalledWith(URL_VALUE, expect.anything());
    expect(native.lastFileParts).toEqual(["CACHE", "flyer-el-sazon-de-ale.jpg"]);
    expect(native.shareAsync).toHaveBeenCalledWith("file:///cache/flyer-el-sazon.jpg");
  });

  it("replaces a cached copy from an earlier download", async () => {
    native.exists = true;

    await downloadFlyer(URL_VALUE, "El Sazón de Ale");

    expect(native.deleted).toEqual(["flyer-el-sazon-de-ale.jpg"]);
    expect(native.downloadFileAsync).toHaveBeenCalled();
  });

  it("falls back to the browser when sharing is unavailable", async () => {
    native.available = false;

    await downloadFlyer(URL_VALUE, "El Sazón de Ale");

    expect(native.openURL).toHaveBeenCalledWith(URL_VALUE);
    expect(native.downloadFileAsync).not.toHaveBeenCalled();
    expect(native.shareAsync).not.toHaveBeenCalled();
  });
});
