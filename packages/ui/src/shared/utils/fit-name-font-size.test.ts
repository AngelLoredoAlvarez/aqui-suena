import { fitNameFontSize } from "@aqui-suena/ui/shared/utils/fit-name-font-size";
import { describe, expect, it } from "vitest";

describe("fitNameFontSize", () => {
  it("keeps the base size for short names", () => {
    expect(fitNameFontSize("Casa Rosa", 304, 24)).toBe(24);
  });

  it("shrinks a long name to fit the available width", () => {
    expect(fitNameFontSize("Comida Casera con Sabor a Perú", 304, 24)).toBe(18);
  });

  it("never goes below the minimum size", () => {
    expect(fitNameFontSize("x".repeat(100), 304, 24)).toBe(16);
  });

  it("honors a custom minimum size", () => {
    expect(fitNameFontSize("x".repeat(100), 304, 14, 10)).toBe(10);
  });

  it("shrinks within a custom range", () => {
    expect(fitNameFontSize("x".repeat(40), 244, 14, 10)).toBe(11);
  });

  it("keeps the base size when the width is unknown", () => {
    expect(fitNameFontSize("Comida Casera con Sabor a Perú", undefined, 24)).toBe(24);
  });
});
