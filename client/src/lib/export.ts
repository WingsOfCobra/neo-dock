/* ── Data export utilities – JSON & CSV download ──────────── */

/**
 * Flatten a nested object into dot-separated keys.
 * e.g. { memory: { total: 8 } } → { memory_total: 8 }
 */
function flatten(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const flatKey = prefix ? `${prefix}_${key}` : key;
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      Object.assign(result, flatten(value as Record<string, unknown>, flatKey));
    } else {
      result[flatKey] = value;
    }
  }
  return result;
}

/** Trigger a browser download from a Blob */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export arbitrary data as pretty-printed JSON */
export function exportJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/** Escape a CSV cell value: wrap in quotes if it contains commas, quotes, or newlines */
function escapeCSV(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Export an array of records as CSV with auto-detected columns */
export function exportCSV(
  rows: Record<string, unknown>[],
  filename: string,
): void {
  if (rows.length === 0) return;

  // Flatten all rows first
  const flatRows = rows.map((r) => flatten(r));

  // Collect all unique column names from all rows (preserving order from first row)
  const colSet = new Set<string>();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      colSet.add(key);
    }
  }
  const columns = Array.from(colSet);

  const header = columns.map(escapeCSV).join(',');
  const lines = flatRows.map((row) =>
    columns.map((col) => escapeCSV(row[col])).join(','),
  );

  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, filename);
}

/** Generate a timestamped filename: neo-dock_{widget}_{YYYY-MM-DD_HHmmss}.{ext} */
export function makeFilename(widget: string, ext: 'json' | 'csv'): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `neo-dock_${widget}_${ts}.${ext}`;
}
