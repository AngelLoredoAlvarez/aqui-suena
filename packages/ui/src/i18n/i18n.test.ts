import { describe, expect, it } from "vitest";

import { defaultLocale, en, es, getDictionary, resolveLocale } from "./locales";

// T1 contract: typed es/en dictionaries with an exact -> base -> default
// fallback chain. The parity test fails whenever a key is missing in
// either language, so adding a language means adding one file plus one
// union entry.
describe("i18n contract", () => {
  it("has key parity: every es key exists in en", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it("formats the listener count in both locales", () => {
    expect(es.listening(42)).toContain("42");
    expect(en.listening(42)).toContain("42");
  });

  it("resolves exact locales", () => {
    expect(resolveLocale("es")).toBe("es");
    expect(resolveLocale("en")).toBe("en");
  });

  it("falls back from region to base", () => {
    expect(resolveLocale("es-MX")).toBe("es");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("en_US")).toBe("en");
  });

  it("falls back to es on unknown or missing input", () => {
    expect(resolveLocale("fr")).toBe("es");
    expect(resolveLocale(undefined)).toBe("es");
    expect(resolveLocale("")).toBe("es");
    expect(defaultLocale).toBe("es");
  });

  it("getDictionary returns the matching dictionary and es by default", () => {
    expect(getDictionary("en").pause).toBe(en.pause);
    expect(getDictionary("es").pause).toBe(es.pause);
    expect(getDictionary("fr").pause).toBe(es.pause);
    expect(getDictionary(undefined).pause).toBe(es.pause);
  });

  it("ships spot translations", () => {
    expect(es.playing).toBe("Reproduciendo");
    expect(en.playing).toBe("Playing");
    expect(es.tapToEnableSound).toBe("Toca para activar el sonido");
    expect(en.tapToEnableSound).toBe("Tap to enable sound");
    expect(en.signalUnavailable).toBe("Signal unavailable, trying mirror…");
    expect(en.loadingStation).toBe("Loading station status…");
    expect(es.sheetTitle).toBe("Estaciones");
    expect(en.sheetTitle).toBe("Stations");
    expect(es.liveBadge).toBe("En vivo");
    expect(en.liveBadge).toBe("Live");
    expect(es.closeSheet).toBe("Cerrar");
    expect(en.closeSheet).toBe("Close");
  });
});
