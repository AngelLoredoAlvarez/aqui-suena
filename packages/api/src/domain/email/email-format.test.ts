import {
  formatEmailDate,
  formatEmailHours,
  formatEmailMoney,
} from "@aqui-suena/api/domain/email/email-format";
import { describe, expect, it } from "vitest";

describe("formatEmailDate", () => {
  it("formats a date in long Mexican Spanish", () => {
    expect(formatEmailDate("es-MX", new Date("2026-02-08T12:00:00Z"))).toBe("8 de febrero de 2026");
  });

  it("formats a date in English", () => {
    expect(formatEmailDate("en", new Date("2026-02-08T12:00:00Z"))).toBe("February 8, 2026");
  });
});

describe("formatEmailMoney", () => {
  it("formats minor units as MXN", () => {
    expect(formatEmailMoney("es-MX", 4900)).toBe("$49.00 MXN");
  });

  it("keeps two decimals", () => {
    expect(formatEmailMoney("en", 9900)).toBe("$99.00 MXN");
  });
});

describe("formatEmailHours", () => {
  it("uses the plural label for multiple hours", () => {
    expect(formatEmailHours("es-MX", 24)).toBe("24 horas");
    expect(formatEmailHours("en", 24)).toBe("24 hours");
  });

  it("uses the singular label for one hour", () => {
    expect(formatEmailHours("es-MX", 1)).toBe("1 hora");
    expect(formatEmailHours("en", 1)).toBe("1 hour");
  });
});
