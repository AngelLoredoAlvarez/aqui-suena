/**
 * Add calendar months to an instant using UTC arithmetic.
 *
 * The day is clamped to the last day of the target month so a subscription
 * that starts on the 31st does not roll into the following month. All reads
 * and writes use UTC, so the result is independent of the process time zone
 * (Node locally and the Cloudflare Worker). The input Date is not mutated.
 */
export function addMonths(date: Date, months: number): Date {
  const targetMonthIndex = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDayOfMonth = new Date(date);
  lastDayOfMonth.setUTCFullYear(targetYear, targetMonth + 1, 0);
  const lastDay = lastDayOfMonth.getUTCDate();

  const result = new Date(date);
  result.setUTCFullYear(targetYear, targetMonth, Math.min(date.getUTCDate(), lastDay));

  return result;
}
