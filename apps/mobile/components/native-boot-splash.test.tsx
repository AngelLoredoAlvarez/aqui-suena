// @vitest-environment jsdom

import { NativeBootSplash } from "@aqui-suena/mobile/components/native-boot-splash";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

describe("NativeBootSplash", () => {
  it("renders the title and the 17 Labs footer mark", () => {
    render(<NativeBootSplash />);

    expect(screen.getByText("Aquí Suena")).toBeTruthy();
    expect(screen.getByText("by")).toBeTruthy();
    expect(screen.getByText("17")).toBeTruthy();
    expect(screen.getByText("Labs")).toBeTruthy();
  });

  it("exposes the loading state through two progressbar regions", () => {
    render(<NativeBootSplash />);

    expect(screen.getByLabelText("Cargando Aquí Suena")).toBeTruthy();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });
});
