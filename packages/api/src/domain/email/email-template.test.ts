import {
  DEFAULT_EMAIL_LOCALE,
  EMAIL_LOCALES,
  isEmailLocale,
  resolveEmailLocale,
} from "@aqui-suena/api/domain/email/email-template";
import { describe, expect, it } from "vitest";

describe("resolveEmailLocale", () => {
  it("keeps every supported locale", () => {
    for (const locale of EMAIL_LOCALES) {
      expect(resolveEmailLocale(locale)).toBe(locale);
    }
  });

  it("falls back to the default for unsupported values", () => {
    expect(resolveEmailLocale("fr")).toBe(DEFAULT_EMAIL_LOCALE);
    expect(resolveEmailLocale("")).toBe(DEFAULT_EMAIL_LOCALE);
    expect(resolveEmailLocale(null)).toBe(DEFAULT_EMAIL_LOCALE);
    expect(resolveEmailLocale(undefined)).toBe(DEFAULT_EMAIL_LOCALE);
    expect(resolveEmailLocale(42)).toBe(DEFAULT_EMAIL_LOCALE);
  });
});

describe("isEmailLocale", () => {
  it("narrows only supported locales", () => {
    expect(isEmailLocale("es-MX")).toBe(true);
    expect(isEmailLocale("en")).toBe(true);
    expect(isEmailLocale("xx")).toBe(false);
    expect(isEmailLocale(null)).toBe(false);
  });
});
