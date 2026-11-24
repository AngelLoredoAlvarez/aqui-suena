// @vitest-environment jsdom
import { UiProvider } from "@aqui-suena/ui/shared/provider";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

let seen: QueryClient | null = null;

function Probe() {
  seen = useQueryClient();
  return null;
}

describe("UiProvider query client", () => {
  afterEach(() => {
    cleanup();
    seen = null;
  });

  it("uses the client passed by the app", () => {
    const provided = new QueryClient();

    render(
      <UiProvider queryClient={provided}>
        <Probe />
      </UiProvider>,
    );

    expect(seen).toBe(provided);
  });

  it("creates a fallback client when none is provided", () => {
    render(
      <UiProvider>
        <Probe />
      </UiProvider>,
    );

    expect(seen).toBeInstanceOf(QueryClient);
  });
});
