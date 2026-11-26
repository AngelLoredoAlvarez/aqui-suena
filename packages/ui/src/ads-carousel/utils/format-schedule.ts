import type { AdsCarouselHour } from "@aqui-suena/api/client";

export function formatMinute(minute: number): string {
  const normalized = ((minute % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${hour}:${String(mins).padStart(2, "0")}`;
}

export function formatSchedule(
  hours: readonly AdsCarouselHour[],
  weekdays: readonly string[],
): string {
  if (hours.length === 0) return "";

  const byDay = new Map<number, { openMinute: number; closeMinute: number }>();

  for (const hour of hours) {
    byDay.set(hour.day, { openMinute: hour.openMinute, closeMinute: hour.closeMinute });
  }

  const groups: {
    start: number;
    end: number;
    openMinute: number;
    closeMinute: number;
  }[] = [];

  for (let day = 0; day < 7; day++) {
    const range = byDay.get(day);
    if (!range) continue;

    const last = groups[groups.length - 1];

    if (
      last &&
      last.end === day - 1 &&
      last.openMinute === range.openMinute &&
      last.closeMinute === range.closeMinute
    ) {
      last.end = day;
    } else {
      groups.push({ start: day, end: day, ...range });
    }
  }

  return groups
    .map((group) => {
      const days =
        group.start === group.end
          ? (weekdays[group.start] ?? "")
          : `${weekdays[group.start] ?? ""}–${weekdays[group.end] ?? ""}`;

      return `${days} ${formatMinute(group.openMinute)} – ${formatMinute(group.closeMinute)}`;
    })
    .join(" · ");
}
