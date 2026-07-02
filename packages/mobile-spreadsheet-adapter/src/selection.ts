import type {
  CellPoint,
  CellRange,
  CellRect,
  RangeEndpoints,
  RangeSelectionResult,
  SelectRangeEndOptions,
  SheetLike,
} from './types.ts';
import { getElement, getOverlayElement, getSheet } from './runtime.ts';

/**
 * 将浏览器视口坐标转换为 x-spreadsheet 数据模型返回的单元格矩形。
 */
export function cellRectByClientPoint(
  spreadsheet: unknown,
  clientX: number,
  clientY: number,
): CellRect | null {
  const sheet = getSheet(spreadsheet);
  const overlayEl = getOverlayElement(sheet);
  if (!sheet?.data?.getCellRectByXY || !overlayEl) return null;

  const rect = overlayEl.getBoundingClientRect();
  const scaleX = rect.width ? overlayEl.offsetWidth / rect.width : 1;
  const scaleY = rect.height ? overlayEl.offsetHeight / rect.height : 1;
  const offsetX = (clientX - rect.left) * scaleX;
  const offsetY = (clientY - rect.top) * scaleY;
  return sheet.data.getCellRectByXY(offsetX, offsetY);
}

/**
 * 判断行列索引是否位于当前选区内。
 */
export function selectedRangeIncludes(spreadsheet: unknown, ri: number, ci: number): boolean {
  const sheet = getSheet(spreadsheet);
  const range = sheet?.data?.selector?.range || sheet?.selector?.range;
  return range?.includes?.(ri, ci) === true;
}

/**
 * 读取 spreadsheet 运行时的当前选区。
 */
export function getSelectedRange(spreadsheet: unknown): CellRange | null {
  const sheet = getSheet(spreadsheet);
  return sheet?.selector?.range || sheet?.data?.selector?.range || null;
}

/**
 * 将选区范围拆成起点和终点，供手柄拖拽时计算固定锚点使用。
 */
export function getRangeStartEnd(range: CellRange | null): RangeEndpoints | null {
  if (!range) return null;
  return {
    start: { ri: range.sri, ci: range.sci },
    end: { ri: range.eri, ci: range.eci },
  };
}

/**
 * 同步 x-spreadsheet 内部 selector 锚点，让后续 setEnd 从指定单元格开始扩展。
 */
export function setSelectionAnchor(sheet: SheetLike | null, anchor: CellPoint | null | undefined): void {
  if (!sheet || !anchor) return;
  // x-spreadsheet 会基于 selector indexes 扩展选区。这里同步更新运行时 selector 对象，让手柄调整能力无需 patch 表格基座。
  sheet.data?.selector?.setIndexes?.(anchor.ri, anchor.ci);
  if (sheet.selector) {
    sheet.selector.indexes = [anchor.ri, anchor.ci];
    sheet.selector.moveIndexes = [anchor.ri, anchor.ci];
  }
}

/**
 * 返回当前选区渲染后的 DOM 矩形，坐标为浏览器视口坐标。
 */
export function selectedRangeClientRect(spreadsheet: unknown): DOMRect | null {
  const sheet = getSheet(spreadsheet);
  const areaEl = getElement(sheet?.selector?.br?.areaEl);
  if (!areaEl || areaEl.offsetParent === null) return null;
  return areaEl.getBoundingClientRect();
}

/**
 * 将当前选区扩展到浏览器视口坐标下的单元格。
 */
export function selectRangeEndByClientPoint(
  spreadsheet: unknown,
  clientX: number,
  clientY: number,
  options: SelectRangeEndOptions = {},
): RangeSelectionResult | null {
  const sheet = getSheet(spreadsheet);
  const cellRect = cellRectByClientPoint(spreadsheet, clientX, clientY);
  if (!sheet || !cellRect || cellRect.ri < 0 || cellRect.ci < 0) return null;

  const moving = options.moving !== false;
  if (options.anchor) setSelectionAnchor(sheet, options.anchor);
  sheet.selector?.setEnd?.(cellRect.ri, cellRect.ci, moving);

  const range = sheet.selector?.range || sheet.data?.selector?.range || null;
  const cell = sheet.data?.getCell?.(cellRect.ri, cellRect.ci);
  sheet.trigger?.('cells-selected', cell, range);
  sheet.toolbar?.reset?.();
  sheet.table?.render?.();

  return {
    ri: cellRect.ri,
    ci: cellRect.ci,
    range,
  };
}
