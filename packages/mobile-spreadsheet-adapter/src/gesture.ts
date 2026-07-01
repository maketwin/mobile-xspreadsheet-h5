import type {
  AdapterState,
  CellPoint,
  MobileSpreadsheetAdapter,
  MobileSpreadsheetAdapterOptions,
} from './types.ts';
import {
  cellRectByClientPoint,
  getRangeStartEnd,
  getSelectedRange,
  selectRangeEndByClientPoint,
} from './selection.ts';
import { defaultNow, getScrollbars, moveScrollbar } from './runtime.ts';

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
