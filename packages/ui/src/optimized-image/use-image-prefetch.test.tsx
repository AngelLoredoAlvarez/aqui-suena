// @vitest-environment jsdom

import { useImagePrefetch } from "@aqui-suena/ui/optimized-image/use-image-prefetch";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("useImagePrefetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefetches each URL once", () => {
    const created: string[] = [];

    class FakeImage {
      set src(value: string) {
        created.push(value);
      }
    }

    vi.stubGlobal("Image", FakeImage);

    const first = `https://example.com/${crypto.randomUUID()}.png`;
    const second = `https://example.com/${crypto.randomUUID()}.png`;

    const { rerender } = renderHook(({ urls }) => useImagePrefetch(urls), {
      initialProps: { urls: [first] },
    });

    expect(created).toEqual([first]);

    rerender({ urls: [first] });
    expect(created).toEqual([first]);

    rerender({ urls: [first, second] });
    expect(created).toEqual([first, second]);

    renderHook(() => useImagePrefetch([first]));
    expect(created).toEqual([first, second]);
  });
});
