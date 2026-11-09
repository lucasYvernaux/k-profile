/** RFC 4180 CSV with protection against spreadsheet formula injection. */
function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  // Neutralise spreadsheet formula injection (OWASP CSV injection).
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(rows: readonly Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }
  const columns = Object.keys(rows[0]);
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}
