// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { useListenerStatus } from "./listener-status";
import { PlayerLanding } from "./player-landing";
import { UiProvider } from "./provider";

function renderLanding() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UiProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </UiProvider>
  );
  return render(<PlayerLanding />, { wrapper });
}

describe("PlayerLanding listener status", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a loading state before the status resolves", () => {
    renderLanding();

    expect(screen.getByText("Loading station status…")).toBeTruthy();
  });

  it("shows the station status once loaded", async () => {
    renderLanding();

    expect(await screen.findByText(/listening/)).toBeTruthy();
  });

  it("shows an error state when the status fails", async () => {
    function BrokenStatus() {
      const { isError } = useListenerStatus("");
      return isError ? <span>Station status unavailable.</span> : null;
    }

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <BrokenStatus />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Station status unavailable.")).toBeTruthy();
  });
});
