import { numericValue } from './format';

export function toCsv(columns: string[], rows: Record<string, string | number | null>[]): string {
  const escape = (value: string | number | null) => {
    let text = value === null ? '' : String(value);
    if (numericValue(value) === null && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [columns.map(escape).join(','), ...rows.map(row => columns.map(column => escape(row[column] ?? null)).join(','))].join('\r\n');
}

export function downloadCsv(columns: string[], rows: Record<string, string | number | null>[]) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', toCsv(columns, rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `olist-result-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
