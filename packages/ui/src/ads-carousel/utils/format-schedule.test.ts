import { formatMinute, formatSchedule } from "@aqui-suena/ui/ads-carousel/utils/format-schedule";
import { es } from "@aqui-suena/ui/i18n/locales";
import { describe, expect, it } from "vitest";

describe("formatMinute", () => {
  it("formats minutes without a leading hour zero", () => {
    expect(formatMinute(480)).toBe("8:00");
    expect(formatMinute(570)).toBe("9:30");
    expect(formatMinute(18 * 60 + 30)).toBe("18:30");
  });
});

describe("formatSchedule", () => {
  it("groups consecutive days with the same range", () => {
    const hours = [1, 2, 3, 4, 5, 6].map((day) => ({
      day,
      openMinute: 9 * 60,
      closeMinute: 17 * 60,
    }));

    expect(formatSchedule(hours, es.weekdays)).toBe("Lun–Sáb 9:00 – 17:00");
  });

  it("keeps non-consecutive days in separate groups", () => {
    const hours = [
      { day: 1, openMinute: 8 * 60, closeMinute: 12 * 60 },
      { day: 3, openMinute: 8 * 60, closeMinute: 12 * 60 },
    ];

    expect(formatSchedule(hours, es.weekdays)).toBe("Lun 8:00 – 12:00 · Mié 8:00 – 12:00");
  });

  it("returns an empty string without hours", () => {
    expect(formatSchedule([], es.weekdays)).toBe("");
  });
});
