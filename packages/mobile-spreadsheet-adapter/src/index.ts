export interface CellPoint {
  /** 从 0 开始的行索引。 */
  ri: number;
  /** 从 0 开始的列索引。 */
  ci: number;
}

export interface CellRect extends CellPoint {
  /** 在表格覆盖层坐标系中的 left 偏移。 */
  left: number;
  /** 在表格覆盖层坐标系中的 top 偏移。 */
  top: number;
  /** 单元格宽度，单位为表格覆盖层像素。 */
  width: number;
  /** 单元格高度，单位为表格覆盖层像素。 */
  height: number;
}

export interface CellRange {
  /** 起始行索引。 */
  sri: number;
  /** 起始列索引。 */
  sci: number;
  /** 结束行索引。 */
  eri: number;
  /** 结束列索引。 */
  eci: number;
  /** x-spreadsheet 提供的选区判断方法，可用时存在。 */
  includes?: (ri: number, ci: number) => boolean;
  /** 判断选区是否包含多个单元格，可用时存在。 */
  multiple?: () => boolean;
  /** 选区大小，格式为 [行数, 列数]，可用时存在。 */
  size?: () => [number, number];
  /** 表格地址字符串表示，可用时存在。 */
  toString?: () => string;
}

export interface RangeSelectionResult extends CellPoint {
  /** 拖拽或手柄移动后的选区结果。 */
  range: CellRange | null;
}

export interface PinchState {
  /** 捏合开始时两个 pointer 之间的距离。 */
  startDistance: number;
  /** 当前两个 pointer 之间的距离。 */
  currentDistance?: number;
  /** currentDistance / startDistance。 */
  scaleDelta?: number;
  /** 宿主可选写入的基础缩放值。 */
  baseScale?: number;
}

export interface HostSelection extends Partial<CellPoint> {
  /** 宿主应用维护的当前单元格文本。 */
  text?: string;
  /** 宿主应用维护的当前选区。 */
  range?: CellRange | null;
}

export interface SelectRangeEndOptions {
  /** pointer 释放后的最后一次选区更新可传 false。 */
  moving?: boolean;
  /** 拖拽选区手柄时使用的固定选区锚点。 */
  anchor?: CellPoint | null;
}

export interface MobileSpreadsheetAdapterOptions {
  /** x-spreadsheet 实例。 */
  spreadsheet: unknown;
  /** 接收 pointer 事件的元素，通常是表格上方的手势层。 */
  target: HTMLElement;
  /** 返回宿主应用最新的选区状态。 */
  getSelected?: () => HostSelection | null | undefined;
  /** 确认单击后调用。 */
  onSingleTap?: (event: PointerEvent) => void;
  /** 确认双击后调用。 */
  onDoubleTap?: (event: PointerEvent) => void;
  /** 稳定按压超过 longPressMs 后调用。 */
  onLongPress?: (event: PointerEvent) => void;
  /** 选区拖拽超过 dragStartTolerance 后调用一次。 */
  onRangeDragStart?: (result: RangeSelectionResult | null, event: PointerEvent) => void;
  /** 活跃拖拽改变选区时调用。 */
  onRangeDragMove?: (result: RangeSelectionResult | null, event: PointerEvent) => void;
  /** 活跃选区拖拽结束时调用。 */
  onRangeDragEnd?: (result: RangeSelectionResult | null, event: PointerEvent) => void;
  /** 两个活跃 pointer 开始捏合时调用。 */
  onPinchStart?: (pinch: PinchState, event: PointerEvent) => void;
  /** 捏合距离变化时调用。 */
  onPinchMove?: (pinch: PinchState, event: PointerEvent) => void;
  /** 捏合结束时调用。 */
  onPinchEnd?: (pinch: PinchState, event: PointerEvent) => void;
  /** 从 pointer 事件中检测宿主渲染的选区手柄。 */
  isSelectionHandle?: (event: PointerEvent) => Element | null | undefined;
  /** 长按阈值，单位毫秒。默认 550。 */
  longPressMs?: number;
  /** 稳定点击允许的移动距离。默认 10 CSS 像素。 */
  tapMoveTolerance?: number;
  /** 进入选区拖拽前需要达到的移动距离。默认 14 CSS 像素。 */
  dragStartTolerance?: number;
  /** 双击时间窗口，单位毫秒。默认 320。 */
  doubleTapMs?: number;
  /** 双击距离容差。默认 24 CSS 像素。 */
  doubleTapTolerance?: number;
  /** 选区拖拽靠近视口边缘时是否自动滚动。默认 true。 */
  edgeScroll?: boolean;
  /** 自动滚动边缘区域大小。默认 42 CSS 像素。 */
  edgeSize?: number;
  /** 每个动画帧的最大自动滚动增量。默认 18。 */
  edgeMaxSpeed?: number;
}

export interface MobileSpreadsheetAdapter {
  /** 移除适配器持有的监听器、定时器和动画帧。 */
  destroy: () => void;
}

interface SpreadsheetLike {
  sheet?: SheetLike;
  resize?: () => unknown;
  reload?: () => unknown;
  reRender?: () => unknown;
}

interface SheetLike {
  overlayerEl?: ElementWrapper<HTMLElement>;
  data?: {
    selector?: SelectorDataLike;
    getCellRectByXY?: (x: number, y: number) => CellRect;
    getCell?: (ri: number, ci: number) => unknown;
  };
  selector?: SelectorComponentLike;
  trigger?: (eventName: string, cell: unknown, range: CellRange | null) => void;
  toolbar?: {
    reset?: () => void;
  };
  table?: {
    render?: () => void;
  };
  horizontalScrollbar?: ScrollbarLike;
  verticalScrollbar?: ScrollbarLike;
}

interface SelectorDataLike extends CellPoint {
  range?: CellRange;
  setIndexes?: (ri: number, ci: number) => void;
}

interface SelectorComponentLike {
  range?: CellRange;
  indexes?: [number, number];
  moveIndexes?: [number, number];
  setEnd?: (ri: number, ci: number, moving?: boolean) => void;
  br?: {
    areaEl?: ElementWrapper<HTMLElement>;
  };
}

interface ScrollbarLike {
  scroll?: () => Record<string, number>;
  move?: (value: Record<string, number>) => void;
}

interface ElementWrapper<T extends HTMLElement> {
  el?: T;
}

interface RangeEndpoints {
  start: CellPoint;
  end: CellPoint;
}

interface TapStart {
  pointerId: number;
  x: number;
  y: number;
  time: number;
  moved: boolean;
}

interface LastTap {
  time: number;
  x: number;
  y: number;
  ri?: number;
  ci?: number;
}

interface RangeDragState {
  pointerId: number;
  x: number;
  y: number;
  active: boolean;
  canStart: boolean;
  started: boolean;
  anchor: CellPoint | null;
  handleRole: string | null;
}

interface EdgeScrollPoint {
  clientX: number;
  clientY: number;
  anchor: CellPoint | null;
}

interface AdapterState {
  pointers: Map<number, PointerEvent>;
  tapStart: TapStart | null;
  lastTap: LastTap | null;
  longPressTimer: ReturnType<typeof window.setTimeout> | 0;
  longPressPointerId: number | null;
  longPressStart: { x: number; y: number } | null;
  longPressTriggered: boolean;
  rangeDrag: RangeDragState | null;
  pinch: PinchState | null;
  edgeScrollFrame: number;
  edgeScrollPoint: EdgeScrollPoint | null;
}

function asSpreadsheet(spreadsheet: unknown): SpreadsheetLike {
  return (spreadsheet || {}) as SpreadsheetLike;
}

function getSheet(spreadsheet: unknown): SheetLike | null {
  const spreadsheetLike = asSpreadsheet(spreadsheet);
  return spreadsheetLike.sheet || (spreadsheet as SheetLike) || null;
}

function getElement<T extends HTMLElement>(value?: ElementWrapper<T> | T): T | undefined {
  return value && 'el' in value ? value.el : value;
}

function getOverlayElement(sheet: SheetLike | null): HTMLElement | undefined {
  return getElement(sheet?.overlayerEl);
}

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

function getRangeStartEnd(range: CellRange | null): RangeEndpoints | null {
  if (!range) return null;
  return {
    start: { ri: range.sri, ci: range.sci },
    end: { ri: range.eri, ci: range.eci },
  };
}

function setSelectionAnchor(sheet: SheetLike | null, anchor: CellPoint | null | undefined): void {
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

function getScrollbars(spreadsheet: unknown): {
  horizontal?: ScrollbarLike;
  vertical?: ScrollbarLike;
} {
  const sheet = getSheet(spreadsheet);
  return {
    horizontal: sheet?.horizontalScrollbar,
    vertical: sheet?.verticalScrollbar,
  };
}

function moveScrollbar(scrollbar: ScrollbarLike | undefined, key: string, delta: number): void {
  if (!scrollbar || !delta) return;
  const current = scrollbar.scroll?.() || {};
  const currentValue = Number(current[key] || 0);
  scrollbar.move?.({ [key]: Math.max(0, currentValue + delta) });
}

function defaultNow(): number {
  return performance.now();
}

/**
 * 在宿主元素上挂载移动端手势适配器。
 */
export function mountMobileSpreadsheetAdapter(options: MobileSpreadsheetAdapterOptions): MobileSpreadsheetAdapter {
  const {
    spreadsheet,
    target,
    getSelected,
    onSingleTap,
    onDoubleTap,
    onLongPress,
    onRangeDragStart,
    onRangeDragMove,
    onRangeDragEnd,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    isSelectionHandle = event => (event.target as Element | null)?.closest?.('[data-mobile-selection-handle]'),
    longPressMs = 550,
    tapMoveTolerance = 10,
    dragStartTolerance = 14,
    doubleTapMs = 320,
    doubleTapTolerance = 24,
    edgeScroll = true,
    edgeSize = 42,
    edgeMaxSpeed = 18,
  } = options || {};

  if (!target) {
    throw new Error('mountMobileSpreadsheetAdapter 需要传入 target 元素。');
  }

  const state: AdapterState = {
    // 手势仲裁封装在适配包内部，宿主只接收已经判定好的单击、拖选、长按、捏合等回调。
    pointers: new Map(),
    tapStart: null,
    lastTap: null,
    longPressTimer: 0,
    longPressPointerId: null,
    longPressStart: null,
    longPressTriggered: false,
    rangeDrag: null,
    pinch: null,
    edgeScrollFrame: 0,
    edgeScrollPoint: null,
  };

  function clearLongPress(): void {
    window.clearTimeout(state.longPressTimer);
    state.longPressTimer = 0;
    state.longPressPointerId = null;
    state.longPressStart = null;
  }

  function stopEdgeScroll(): void {
    if (state.edgeScrollFrame) window.cancelAnimationFrame(state.edgeScrollFrame);
    state.edgeScrollFrame = 0;
    state.edgeScrollPoint = null;
  }

  function selectedIncludesPoint(event: PointerEvent): boolean {
    const selected = getSelected?.();
    const cellRect = cellRectByClientPoint(spreadsheet, event.clientX, event.clientY);
    if (!cellRect || cellRect.ri < 0 || cellRect.ci < 0) return false;
    if (selected?.range?.includes?.(cellRect.ri, cellRect.ci)) return true;
    return selected?.ri === cellRect.ri && selected?.ci === cellRect.ci;
  }

  function getHandleDrag(event: PointerEvent): {
    handle: Element;
    role: string;
    anchor: CellPoint;
  } | null {
    const handle = isSelectionHandle?.(event);
    if (!handle) return null;
    const range = getSelectedRange(spreadsheet);
    const endpoints = getRangeStartEnd(range);
    if (!endpoints) return null;
    const role = handle.getAttribute('data-mobile-selection-handle') || 'end';
    // 拖拽某个手柄时，将对角固定为选区锚点。
    return {
      handle,
      role,
      anchor: role === 'start' ? endpoints.end : endpoints.start,
    };
  }

  function edgeDelta(clientX: number, clientY: number): { dx: number; dy: number } {
    const rect = target.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    if (clientX < rect.left + edgeSize) {
      dx = -edgeMaxSpeed * (1 - ((clientX - rect.left) / edgeSize));
    } else if (clientX > rect.right - edgeSize) {
      dx = edgeMaxSpeed * (1 - ((rect.right - clientX) / edgeSize));
    }
    if (clientY < rect.top + edgeSize) {
      dy = -edgeMaxSpeed * (1 - ((clientY - rect.top) / edgeSize));
    } else if (clientY > rect.bottom - edgeSize) {
      dy = edgeMaxSpeed * (1 - ((rect.bottom - clientY) / edgeSize));
    }
    return {
      dx: Math.trunc(dx),
      dy: Math.trunc(dy),
    };
  }

  function runEdgeScroll(): void {
    if (!state.edgeScrollPoint || !edgeScroll) {
      state.edgeScrollFrame = 0;
      return;
    }
    // 靠近视口边缘滚动表格时持续扩展选区，使用户能选到当前可视区域之外的单元格。
    const { dx, dy } = edgeDelta(state.edgeScrollPoint.clientX, state.edgeScrollPoint.clientY);
    const { horizontal, vertical } = getScrollbars(spreadsheet);
    moveScrollbar(horizontal, 'left', dx);
    moveScrollbar(vertical, 'top', dy);
    selectRangeEndByClientPoint(spreadsheet, state.edgeScrollPoint.clientX, state.edgeScrollPoint.clientY, {
      moving: true,
      anchor: state.edgeScrollPoint.anchor,
    });
    state.edgeScrollFrame = window.requestAnimationFrame(runEdgeScroll);
  }

  function updateEdgeScroll(event: PointerEvent): void {
    if (!edgeScroll) return;
    const delta = edgeDelta(event.clientX, event.clientY);
    if (!delta.dx && !delta.dy) {
      stopEdgeScroll();
      return;
    }
    state.edgeScrollPoint = {
      clientX: event.clientX,
      clientY: event.clientY,
      anchor: state.rangeDrag?.anchor || null,
    };
    if (!state.edgeScrollFrame) {
      state.edgeScrollFrame = window.requestAnimationFrame(runEdgeScroll);
    }
  }

  function handleRangeDragMove(event: PointerEvent): boolean {
    const drag = state.rangeDrag;
    if (!drag || drag.pointerId !== event.pointerId || !drag.canStart) return false;
    if (state.pointers.size > 1 || state.pinch) {
      state.rangeDrag = null;
      stopEdgeScroll();
      return false;
    }

    const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    if (!drag.active && moved < dragStartTolerance) return false;

    // 超过阈值后，这段 pointer 流才被认定为选区手势。只在此时阻止原生滚动，保证普通表格滚动仍然顺滑。
    drag.active = true;
    event.preventDefault();
    clearLongPress();
    state.lastTap = null;
    if (state.tapStart?.pointerId === event.pointerId) state.tapStart.moved = true;
    const result = selectRangeEndByClientPoint(spreadsheet, event.clientX, event.clientY, {
      moving: true,
      anchor: drag.anchor,
    });
    updateEdgeScroll(event);
    if (!drag.started) {
      drag.started = true;
      onRangeDragStart?.(result, event);
    }
    onRangeDragMove?.(result, event);
    return true;
  }

  function finishRangeDrag(event: PointerEvent): boolean {
    const drag = state.rangeDrag;
    state.rangeDrag = null;
    stopEdgeScroll();
    if (!drag || drag.pointerId !== event.pointerId || !drag.active) return false;
    const result = selectRangeEndByClientPoint(spreadsheet, event.clientX, event.clientY, {
      moving: false,
      anchor: drag.anchor,
    });
    onRangeDragEnd?.(result, event);
    return true;
  }

  function handleTapEnd(event: PointerEvent): void {
    const tapStart = state.tapStart;
    state.tapStart = null;
    if (!tapStart || tapStart.pointerId !== event.pointerId) return;
    if (state.pinch || state.pointers.size > 1 || state.longPressTriggered) {
      state.lastTap = null;
      return;
    }

    const now = defaultNow();
    const moved = Math.hypot(event.clientX - tapStart.x, event.clientY - tapStart.y);
    const isTap = !tapStart.moved && moved <= tapMoveTolerance && now - tapStart.time < 420;
    if (!isTap) return;

    const selected = getSelected?.();
    const lastTap = state.lastTap;
    const isDoubleTap = lastTap
      && now - lastTap.time < doubleTapMs
      && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < doubleTapTolerance
      && lastTap.ri === selected?.ri
      && lastTap.ci === selected?.ci;

    if (isDoubleTap) {
      state.lastTap = null;
      onDoubleTap?.(event);
      return;
    }

    state.lastTap = {
      time: now,
      x: event.clientX,
      y: event.clientY,
      ri: selected?.ri,
      ci: selected?.ci,
    };
    onSingleTap?.(event);
  }

  function onPointerDown(event: PointerEvent): void {
    const handleDrag = getHandleDrag(event);
    if (handleDrag) {
      event.preventDefault();
      event.stopPropagation();
    }
    state.pointers.set(event.pointerId, event);
    state.tapStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: defaultNow(),
      moved: false,
    };
    state.rangeDrag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      active: false,
      canStart: Boolean(handleDrag) || selectedIncludesPoint(event),
      started: false,
      anchor: handleDrag?.anchor || null,
      handleRole: handleDrag?.role || null,
    };

    if (state.pointers.size === 1 && (event.pointerType !== 'mouse' || event.button === 0)) {
      clearLongPress();
      state.longPressTriggered = false;
      state.longPressPointerId = event.pointerId;
      state.longPressStart = { x: event.clientX, y: event.clientY };
      state.longPressTimer = window.setTimeout(() => {
        state.longPressTimer = 0;
        state.longPressTriggered = true;
        state.lastTap = null;
        onLongPress?.(event);
      }, longPressMs);
    }

    if (state.pointers.size === 2) {
      clearLongPress();
      const points = [...state.pointers.values()];
      state.pinch = {
        startDistance: Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY),
      };
      onPinchStart?.(state.pinch, event);
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!state.pointers.has(event.pointerId)) return;
    state.pointers.set(event.pointerId, event);
    if (handleRangeDragMove(event)) return;

    if (state.longPressPointerId === event.pointerId && state.longPressStart) {
      const moved = Math.hypot(event.clientX - state.longPressStart.x, event.clientY - state.longPressStart.y);
      if (moved > tapMoveTolerance) {
        clearLongPress();
        if (state.tapStart?.pointerId === event.pointerId) state.tapStart.moved = true;
      }
    }

    if (state.pointers.size !== 2 || !state.pinch) return;
    event.preventDefault();
    const points = [...state.pointers.values()];
    const currentDistance = Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY);
    onPinchMove?.({
      ...state.pinch,
      currentDistance,
      scaleDelta: state.pinch.startDistance ? currentDistance / state.pinch.startDistance : 1,
    }, event);
  }

  function onPointerUp(event: PointerEvent): void {
    const wasRangeDragging = finishRangeDrag(event);
    if (!wasRangeDragging) handleTapEnd(event);
    state.pointers.delete(event.pointerId);
    if (state.longPressPointerId === event.pointerId) clearLongPress();
    if (state.pointers.size < 2 && state.pinch) {
      const pinch = state.pinch;
      state.pinch = null;
      onPinchEnd?.(pinch, event);
    }
  }

  target.addEventListener('pointerdown', onPointerDown, { passive: false });
  target.addEventListener('pointermove', onPointerMove, { passive: false });
  target.addEventListener('pointerup', onPointerUp, { passive: true });
  target.addEventListener('pointercancel', onPointerUp, { passive: true });

  return {
    destroy() {
      clearLongPress();
      stopEdgeScroll();
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
