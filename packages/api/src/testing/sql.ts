/**
 * Collapses every whitespace run to a single space so assertions describe the
 * statement instead of its layout. A test must not break because a clause moved
 * to the next line.
 */
export function normalizeSql(sql: string | undefined): string {
  return (sql ?? "").replace(/\s+/g, " ").trim();
}
