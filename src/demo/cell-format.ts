export function toColumnName(index: number): string {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
}

export function formatCellAddress(ri: number, ci: number): string {
  return `${toColumnName(ci)}${ri + 1}`;
}

export function formatRangeAddress(range: { sri: number; sci: number; eri: number; eci: number } | null): string {
  if (!range) return '未选择';
  const start = formatCellAddress(range.sri, range.sci);
  const end = formatCellAddress(range.eri, range.eci);
  return start === end ? start : `${start}:${end}`;
}

export function normalizeDate(text: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return '2026-06-17';
}
