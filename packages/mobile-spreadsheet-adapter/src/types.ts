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

export interface SpreadsheetLike {
  sheet?: SheetLike;
  resize?: () => unknown;
  reload?: () => unknown;
  reRender?: () => unknown;
}

export interface SheetLike {
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

export interface SelectorDataLike extends CellPoint {
  range?: CellRange;
  setIndexes?: (ri: number, ci: number) => void;
}

export interface SelectorComponentLike {
  range?: CellRange;
  indexes?: [number, number];
  moveIndexes?: [number, number];
  setEnd?: (ri: number, ci: number, moving?: boolean) => void;
  br?: {
    areaEl?: ElementWrapper<HTMLElement>;
  };
}

export interface ScrollbarLike {
  scroll?: () => Record<string, number>;
  move?: (value: Record<string, number>) => void;
}

export interface ElementWrapper<T extends HTMLElement> {
  el?: T;
}

export interface RangeEndpoints {
  start: CellPoint;
  end: CellPoint;
}

export interface TapStart {
  pointerId: number;
  x: number;
  y: number;
  time: number;
  moved: boolean;
}

export interface LastTap {
  time: number;
  x: number;
  y: number;
  ri?: number;
  ci?: number;
}

export interface RangeDragState {
  pointerId: number;
  x: number;
  y: number;
  active: boolean;
  canStart: boolean;
  started: boolean;
  anchor: CellPoint | null;
  handleRole: string | null;
}

export interface EdgeScrollPoint {
  clientX: number;
  clientY: number;
  anchor: CellPoint | null;
}

export interface AdapterState {
  pointers: Map<number, PointerEvent>;
  tapStart: TapStart | null;
  lastTap: LastTap | null;
  longPressTimer: number | ReturnType<typeof setTimeout>;
  longPressPointerId: number | null;
  longPressStart: { x: number; y: number } | null;
  longPressTriggered: boolean;
  rangeDrag: RangeDragState | null;
  pinch: PinchState | null;
  edgeScrollFrame: number;
  edgeScrollPoint: EdgeScrollPoint | null;
}
