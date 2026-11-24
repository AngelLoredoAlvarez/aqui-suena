// @vitest-environment jsdom

import { OptimizedImage } from "@aqui-suena/ui/optimized-image/optimized-image";
import { UiProvider } from "@aqui-suena/ui/shared";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({
  props: null as Record<string, unknown> | null,
}));

vi.mock("@aqui-suena/ui/optimized-image/image", () => ({
  Image: (props: Record<string, unknown>) => {
    captured.props = props;
    return null;
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <UiProvider>{children}</UiProvider>;
}

const SIGNED =
  "https://media.example.com/media/v1/acc-1/businesses/biz-1/flyer/11111111-1111-1111-1111-111111111111.jpg?X-Amz-Date=20261124T110000Z&X-Amz-Signature=aaa";

describe("OptimizedImage cache key", () => {
  beforeEach(() => {
    captured.props = null;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("passes the image props that the consumer relies on", () => {
    render(
      <OptimizedImage
        src={SIGNED}
        alt="flyer"
        fill
        objectFit="cover"
        objectPosition="center top"
        priority
      />,
      { wrapper },
    );

    expect(captured.props).toMatchObject({
      cacheKey:
        "https://media.example.com/media/v1/acc-1/businesses/biz-1/flyer/11111111-1111-1111-1111-111111111111.jpg",
      objectFit: "cover",
      objectPosition: "center top",
      width: "100%",
      height: "100%",
    });
  });
});
