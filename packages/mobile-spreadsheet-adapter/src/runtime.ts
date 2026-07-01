import type { ElementWrapper, ScrollbarLike, SheetLike, SpreadsheetLike } from './types.ts';

export function asSpreadsheet(spreadsheet: unknown): SpreadsheetLike {
  return (spreadsheet || {}) as SpreadsheetLike;
}

export function getSheet(spreadsheet: unknown): SheetLike | null {
  const spreadsheetLike = asSpreadsheet(spreadsheet);
  return spreadsheetLike.sheet || (spreadsheet as SheetLike) || null;
}

export function getElement<T extends HTMLElement>(value?: ElementWrapper<T> | T): T | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && 'el' in value) return (value as ElementWrapper<T>).el;
  return value as T;
}

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

export function moveScrollbar(scrollbar: ScrollbarLike | undefined, key: string, delta: number): void {
  if (!scrollbar || !delta) return;
  const current = scrollbar.scroll?.() || {};
  const currentValue = Number(current[key] || 0);
  scrollbar.move?.({ [key]: Math.max(0, currentValue + delta) });
}

export function defaultNow(): number {
  return performance.now();
}
