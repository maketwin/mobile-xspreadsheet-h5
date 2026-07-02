/**
 * 将从 0 开始的列索引转换为 Excel 风格列名，例如 0 -> A、27 -> AB。
 */
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

/**
 * 格式化单个单元格地址，例如 ri=1、ci=2 -> C2。
 */
export function formatCellAddress(ri: number, ci: number): string {
  return `${toColumnName(ci)}${ri + 1}`;
}

/**
 * 格式化选区地址，单格返回 A1，多格返回 A1:B2。
 */
export function formatRangeAddress(range: { sri: number; sci: number; eri: number; eci: number } | null): string {
  if (!range) return '未选择';
  const start = formatCellAddress(range.sri, range.sci);
  const end = formatCellAddress(range.eri, range.eci);
  return start === end ? start : `${start}:${end}`;
}

/**
 * 将任意文本归一为 date input 可识别的 yyyy-MM-dd 值。
 */
export function normalizeDate(text: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return '2026-06-17';
}
