// @vitest-environment jsdom

import { downloadFlyer } from "@aqui-suena/ui/flyer-lightbox/download-flyer";
import { afterEach, describe, expect, it, vi } from "vitest";

const URL_VALUE = "https://api.test/images/a.jpg";

describe("downloadFlyer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches the flyer and downloads it with the business name", async () => {
    const blob = new Blob(["flyer"], { type: "image/jpeg" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    const createObjectURL = vi.fn(() => "blob:flyer");
    const revokeObjectURL = vi.fn();
    const downloads: string[] = [];

    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });

    await downloadFlyer(URL_VALUE, "El Sazón de Ale");

    expect(fetchMock).toHaveBeenCalledWith(URL_VALUE);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(downloads).toEqual(["flyer-el-sazon-de-ale.jpg"]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:flyer");
    expect(document.querySelector("a")).toBeNull();
  });

  it("fails without downloading when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn() });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });

    await expect(downloadFlyer(URL_VALUE, "Ad A")).rejects.toThrow("404");

    expect(click).not.toHaveBeenCalled();
  });
});
