const FISCAL_TIME_ZONE = "America/Mexico_City";
/** Annual ISR return month for a persona moral: March of the following year. */
const ANNUAL_RETURN_MONTH = 3;

export type FiscalMonth = { readonly year: number; readonly month: number };

/**
 * Reads a calendar year and month in the SAT's time zone.
 *
 * Comparing instants against a UTC midnight would reject a cancellation sent
 * late on the last day of the window, because Mexico City is behind UTC.
 */
function fiscalCalendar(date: Date): FiscalMonth {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FISCAL_TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

/** Last month in which a CFDI issued at `issuedAt` may be cancelled. */
export function cancellationDeadline(issuedAt: Date): FiscalMonth {
  return { year: fiscalCalendar(issuedAt).year + 1, month: ANNUAL_RETURN_MONTH };
}

/**
 * Article 29-A allows cancelling until the month the annual ISR return is filed
 * for the invoice's fiscal year. For a persona moral that is March, so an
 * invoice issued in 2026 can be cancelled through March 2027.
 */
export function isWithinCancellationWindow(issuedAt: Date, now: Date): boolean {
  // A CFDI cannot be cancelled before it exists, whatever the calendar says.
  if (now.getTime() < issuedAt.getTime()) return false;

  const issued = fiscalCalendar(issuedAt);
  const current = fiscalCalendar(now);
  const deadline = cancellationDeadline(issuedAt);

  if (current.year < issued.year) return false;
  if (current.year === issued.year) return true;

  return current.year === deadline.year && current.month <= deadline.month;
}
