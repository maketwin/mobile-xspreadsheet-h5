function getSheet(spreadsheet) {
  return spreadsheet?.sheet || spreadsheet;
}

function getOverlayElement(sheet) {
  return sheet?.overlayerEl?.el || sheet?.overlayerEl;
}

export function cellRectByClientPoint(spreadsheet, clientX, clientY) {
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

export function selectedRangeIncludes(spreadsheet, ri, ci) {
  const sheet = getSheet(spreadsheet);
  const range = sheet?.data?.selector?.range || sheet?.selector?.range;
  return range?.includes?.(ri, ci) === true;
}

export function selectRangeEndByClientPoint(spreadsheet, clientX, clientY, options = {}) {
  const sheet = getSheet(spreadsheet);
  const cellRect = cellRectByClientPoint(spreadsheet, clientX, clientY);
  if (!sheet || !cellRect || cellRect.ri < 0 || cellRect.ci < 0) return null;

  const moving = options.moving !== false;
  sheet.selector?.setEnd?.(cellRect.ri, cellRect.ci, moving);

  const range = sheet.selector?.range || sheet.data?.selector?.range;
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

export function resizeSpreadsheet(spreadsheet) {
  if (typeof spreadsheet?.resize === 'function') return spreadsheet.resize();
  if (typeof spreadsheet?.reload === 'function') return spreadsheet.reload();
  if (typeof spreadsheet?.reRender === 'function') return spreadsheet.reRender();
  return spreadsheet;
}

function getScrollbars(spreadsheet) {
  const sheet = getSheet(spreadsheet);
  return {
    horizontal: sheet?.horizontalScrollbar,
    vertical: sheet?.verticalScrollbar,
  };
}

function moveScrollbar(scrollbar, key, delta) {
  if (!scrollbar || !delta) return;
  const current = scrollbar.scroll?.() || {};
  const currentValue = Number(current[key] || 0);
  scrollbar.move?.({ [key]: Math.max(0, currentValue + delta) });
}

function defaultNow() {
  return performance.now();
}

export function mountMobileSpreadsheetAdapter(options) {
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
    throw new Error('mountMobileSpreadsheetAdapter requires a target element.');
  }

  const state = {
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

  function clearLongPress() {
    window.clearTimeout(state.longPressTimer);
    state.longPressTimer = 0;
    state.longPressPointerId = null;
    state.longPressStart = null;
  }

  function stopEdgeScroll() {
    if (state.edgeScrollFrame) window.cancelAnimationFrame(state.edgeScrollFrame);
    state.edgeScrollFrame = 0;
    state.edgeScrollPoint = null;
  }

  function selectedIncludesPoint(event) {
    const selected = getSelected?.();
    const cellRect = cellRectByClientPoint(spreadsheet, event.clientX, event.clientY);
    if (!cellRect || cellRect.ri < 0 || cellRect.ci < 0) return false;
    if (selected?.range?.includes?.(cellRect.ri, cellRect.ci)) return true;
    return selected?.ri === cellRect.ri && selected?.ci === cellRect.ci;
  }

  function edgeDelta(clientX, clientY) {
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

  function runEdgeScroll() {
    if (!state.edgeScrollPoint || !edgeScroll) {
      state.edgeScrollFrame = 0;
      return;
    }
    const { dx, dy } = edgeDelta(state.edgeScrollPoint.clientX, state.edgeScrollPoint.clientY);
    const { horizontal, vertical } = getScrollbars(spreadsheet);
    moveScrollbar(horizontal, 'left', dx);
    moveScrollbar(vertical, 'top', dy);
    selectRangeEndByClientPoint(spreadsheet, state.edgeScrollPoint.clientX, state.edgeScrollPoint.clientY, { moving: true });
    state.edgeScrollFrame = window.requestAnimationFrame(runEdgeScroll);
  }

  function updateEdgeScroll(event) {
    if (!edgeScroll) return;
    const delta = edgeDelta(event.clientX, event.clientY);
    if (!delta.dx && !delta.dy) {
      stopEdgeScroll();
      return;
    }
    state.edgeScrollPoint = { clientX: event.clientX, clientY: event.clientY };
    if (!state.edgeScrollFrame) {
      state.edgeScrollFrame = window.requestAnimationFrame(runEdgeScroll);
    }
  }

  function handleRangeDragMove(event) {
    const drag = state.rangeDrag;
    if (!drag || drag.pointerId !== event.pointerId || !drag.canStart) return false;
    if (state.pointers.size > 1 || state.pinch) {
      state.rangeDrag = null;
      stopEdgeScroll();
      return false;
    }

    const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    if (!drag.active && moved < dragStartTolerance) return false;

    drag.active = true;
    event.preventDefault();
    clearLongPress();
    state.lastTap = null;
    if (state.tapStart?.pointerId === event.pointerId) state.tapStart.moved = true;
    const result = selectRangeEndByClientPoint(spreadsheet, event.clientX, event.clientY, { moving: true });
    updateEdgeScroll(event);
    if (!drag.started) {
      drag.started = true;
      onRangeDragStart?.(result, event);
    }
    onRangeDragMove?.(result, event);
    return true;
  }

  function finishRangeDrag(event) {
    const drag = state.rangeDrag;
    state.rangeDrag = null;
    stopEdgeScroll();
    if (!drag || drag.pointerId !== event.pointerId || !drag.active) return false;
    const result = selectRangeEndByClientPoint(spreadsheet, event.clientX, event.clientY, { moving: false });
    onRangeDragEnd?.(result, event);
    return true;
  }

  function handleTapEnd(event) {
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

  function onPointerDown(event) {
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
      canStart: selectedIncludesPoint(event),
      started: false,
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

  function onPointerMove(event) {
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

  function onPointerUp(event) {
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

  target.addEventListener('pointerdown', onPointerDown, { passive: true });
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
