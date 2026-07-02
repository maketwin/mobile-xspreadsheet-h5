import type { ElementWrapper, ScrollbarLike, SheetLike, SpreadsheetLike } from './types.ts';

/**
 * 将未知 spreadsheet 实例收窄为适配包需要的最小运行时结构。
 */
export function asSpreadsheet(spreadsheet: unknown): SpreadsheetLike {
  return (spreadsheet || {}) as SpreadsheetLike;
}

/**
 * 兼容 spreadsheet.sheet 和直接传入 sheet 两种接入方式，返回当前工作表对象。
 */
export function getSheet(spreadsheet: unknown): SheetLike | null {
  const spreadsheetLike = asSpreadsheet(spreadsheet);
  return spreadsheetLike.sheet || (spreadsheet as SheetLike) || null;
}

/**
 * 兼容 x-spreadsheet 的 ElementWrapper 和原生 HTMLElement，取出真实 DOM 元素。
 */
export function getElement<T extends HTMLElement>(value?: ElementWrapper<T> | T): T | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && 'el' in value) return (value as ElementWrapper<T>).el;
  return value as T;
}

/**
 * 获取表格覆盖层 DOM，用于把浏览器坐标换算到表格内部坐标。
 */
export function getOverlayElement(sheet: SheetLike | null): HTMLElement | undefined {
  return getElement(sheet?.overlayerEl);
}

/**
 * 根据宿主 spreadsheet 暴露的生命周期方法执行 resize 或重新渲染。
 */
export function resizeSpreadsheet<T>(spreadsheet: T): T | unknown {
  const spreadsheetLike = asSpreadsheet(spreadsheet);
  if (typeof spreadsheetLike.resize === 'function') return spreadsheetLike.resize();
  if (typeof spreadsheetLike.reload === 'function') return spreadsheetLike.reload();
  if (typeof spreadsheetLike.reRender === 'function') return spreadsheetLike.reRender();
  return spreadsheet;
}

/**
 * 读取 x-spreadsheet 暴露的横向和纵向滚动条对象。
 */
export function getScrollbars(spreadsheet: unknown): {
  horizontal?: ScrollbarLike;
  vertical?: ScrollbarLike;
} {
  const sheet = getSheet(spreadsheet);
  return {
    horizontal: sheet?.horizontalScrollbar,
    vertical: sheet?.verticalScrollbar,
  };
}

/**
 * 按指定方向移动滚动条，当前用于拖选靠近边缘时自动滚动。
 */
export function moveScrollbar(scrollbar: ScrollbarLike | undefined, key: string, delta: number): void {
  if (!scrollbar || !delta) return;
  const current = scrollbar.scroll?.() || {};
  const currentValue = Number(current[key] || 0);
  scrollbar.move?.({ [key]: Math.max(0, currentValue + delta) });
}

/**
 * 统一封装当前时间，便于后续测试时替换时间源。
 */
export function defaultNow(): number {
  return performance.now();
}
