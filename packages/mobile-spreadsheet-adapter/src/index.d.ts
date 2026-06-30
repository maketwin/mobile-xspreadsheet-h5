export interface CellPoint {
  /** Zero-based row index. */
  ri: number;
  /** Zero-based column index. */
  ci: number;
}

export interface CellRect extends CellPoint {
  /** Left offset in the spreadsheet overlay coordinate space. */
  left: number;
  /** Top offset in the spreadsheet overlay coordinate space. */
  top: number;
  /** Cell width in spreadsheet overlay pixels. */
  width: number;
  /** Cell height in spreadsheet overlay pixels. */
  height: number;
}

export interface CellRange {
  /** Start row index. */
  sri: number;
  /** Start column index. */
  sci: number;
  /** End row index. */
  eri: number;
  /** End column index. */
  eci: number;
  /** x-spreadsheet range helper, when available. */
  includes?: (ri: number, ci: number) => boolean;
  /** Whether the range contains more than one cell, when available. */
  multiple?: () => boolean;
  /** Range size as [rowCount, columnCount], when available. */
  size?: () => [number, number];
  /** Spreadsheet address representation, when available. */
  toString?: () => string;
}

export interface RangeSelectionResult extends CellPoint {
  /** The resulting selected range after drag/handle movement. */
  range: CellRange | null;
}

export interface PinchState {
  /** Distance between two pointers at pinch start. */
  startDistance: number;
  /** Current distance between two pointers. */
  currentDistance?: number;
  /** currentDistance / startDistance. */
  scaleDelta?: number;
  /** Optional host-provided base scale copied onto the pinch object. */
  baseScale?: number;
}

export interface HostSelection extends Partial<CellPoint> {
  /** Current selected cell text tracked by the host app. */
  text?: string;
  /** Current selected range tracked by the host app. */
  range?: CellRange | null;
}

export interface SelectRangeEndOptions {
  /** Pass false for the final range update after pointer release. */
  moving?: boolean;
  /** Fixed range anchor used when dragging selection handles. */
  anchor?: CellPoint | null;
}

export interface MobileSpreadsheetAdapterOptions {
  /** x-spreadsheet instance. */
  spreadsheet: unknown;
  /** Element receiving pointer events, usually a gesture layer above the sheet. */
  target: HTMLElement;
  /** Returns the host app's latest selection state. */
  getSelected?: () => HostSelection | null | undefined;
  /** Called after a confirmed single tap. */
  onSingleTap?: (event: PointerEvent) => void;
  /** Called after a confirmed double tap. */
  onDoubleTap?: (event: PointerEvent) => void;
  /** Called when a press stays stable longer than longPressMs. */
  onLongPress?: (event: PointerEvent) => void;
  /** Called once range dragging crosses dragStartTolerance. */
  onRangeDragStart?: (result: RangeSelectionResult | null, event: PointerEvent) => void;
  /** Called while an active drag changes the selected range. */
  onRangeDragMove?: (result: RangeSelectionResult | null, event: PointerEvent) => void;
  /** Called when an active range drag ends. */
  onRangeDragEnd?: (result: RangeSelectionResult | null, event: PointerEvent) => void;
  /** Called when two active pointers begin a pinch. */
  onPinchStart?: (pinch: PinchState, event: PointerEvent) => void;
  /** Called while pinch distance changes. */
  onPinchMove?: (pinch: PinchState, event: PointerEvent) => void;
  /** Called when a pinch ends. */
  onPinchEnd?: (pinch: PinchState, event: PointerEvent) => void;
  /** Detects a host-rendered selection handle from a pointer event. */
  isSelectionHandle?: (event: PointerEvent) => Element | null | undefined;
  /** Long press threshold in milliseconds. Defaults to 550. */
  longPressMs?: number;
  /** Movement tolerance for stable taps. Defaults to 10 CSS pixels. */
  tapMoveTolerance?: number;
  /** Movement required before a range drag starts. Defaults to 14 CSS pixels. */
  dragStartTolerance?: number;
  /** Double tap time window in milliseconds. Defaults to 320. */
  doubleTapMs?: number;
  /** Double tap distance tolerance. Defaults to 24 CSS pixels. */
  doubleTapTolerance?: number;
  /** Whether range drag auto-scrolls near the viewport edge. Defaults to true. */
  edgeScroll?: boolean;
  /** Edge zone size for auto-scroll. Defaults to 42 CSS pixels. */
  edgeSize?: number;
  /** Max auto-scroll delta per animation frame. Defaults to 18. */
  edgeMaxSpeed?: number;
}

export interface MobileSpreadsheetAdapter {
  /** Remove listeners, timers, and animation frames owned by the adapter. */
  destroy: () => void;
}

/**
 * Convert a browser viewport point to the spreadsheet cell rectangle returned
 * by the x-spreadsheet data model.
 */
export function cellRectByClientPoint(
  spreadsheet: unknown,
  clientX: number,
  clientY: number,
): CellRect | null;

/**
 * Test whether a row/column index is inside the current selected range.
 */
export function selectedRangeIncludes(
  spreadsheet: unknown,
  ri: number,
  ci: number,
): boolean;

/**
 * Read the current selected range from the spreadsheet runtime.
 */
export function getSelectedRange(spreadsheet: unknown): CellRange | null;

/**
 * Return the current selected range's rendered DOM rectangle in viewport
 * coordinates.
 */
export function selectedRangeClientRect(spreadsheet: unknown): DOMRect | null;

/**
 * Extend the current selected range to the cell under a browser viewport point.
 */
export function selectRangeEndByClientPoint(
  spreadsheet: unknown,
  clientX: number,
  clientY: number,
  options?: SelectRangeEndOptions,
): RangeSelectionResult | null;

/**
 * Resize or re-render a spreadsheet instance using whichever lifecycle method
 * the host spreadsheet exposes.
 */
export function resizeSpreadsheet<T = unknown>(spreadsheet: T): T;

/**
 * Mount the mobile gesture adapter on a host element.
 */
export function mountMobileSpreadsheetAdapter(
  options: MobileSpreadsheetAdapterOptions,
): MobileSpreadsheetAdapter;
