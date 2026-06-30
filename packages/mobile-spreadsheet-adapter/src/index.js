function getSheet(spreadsheet) {
  return spreadsheet?.sheet || spreadsheet;
}

function getOverlayElement(sheet) {
  return sheet?.overlayerEl?.el || sheet?.overlayerEl;
}

/**
 * 将浏览器视口坐标转换为 x-spreadsheet 数据模型返回的单元格矩形。
 *
 * 适配包会读取实际渲染后的覆盖层尺寸，而不是假设缩放为 1，因此宿主应用可以用 CSS transform 包裹表格实现捏合缩放。
 *
 * @param {object} spreadsheet x-spreadsheet 实例，或其内部 `sheet`。
 * @param {number} clientX 浏览器视口 x 坐标。
 * @param {number} clientY 浏览器视口 y 坐标。
 * @returns {{ri: number, ci: number, left: number, top: number, width: number, height: number} | null}
 */
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

/**
 * 判断行列索引是否位于当前选区内。
 *
 * @param {object} spreadsheet x-spreadsheet 实例，或其内部 `sheet`。
 * @param {number} ri 行索引。
 * @param {number} ci 列索引。
 * @returns {boolean}
 */
export function selectedRangeIncludes(spreadsheet, ri, ci) {
  const sheet = getSheet(spreadsheet);
  const range = sheet?.data?.selector?.range || sheet?.selector?.range;
  return range?.includes?.(ri, ci) === true;
}

/**
 * 读取 spreadsheet 运行时的当前选区。
 *
 * @param {object} spreadsheet x-spreadsheet 实例，或其内部 `sheet`。
 * @returns {{sri: number, sci: number, eri: number, eci: number, includes?: Function} | null}
 */
export function getSelectedRange(spreadsheet) {
  const sheet = getSheet(spreadsheet);
  return sheet?.selector?.range || sheet?.data?.selector?.range || null;
}

function getRangeStartEnd(range) {
  if (!range) return null;
  return {
    start: { ri: range.sri, ci: range.sci },
    end: { ri: range.eri, ci: range.eci },
  };
}

function setSelectionAnchor(sheet, anchor) {
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
 *
 * 这个函数刻意只做 DOM 辅助，不接管渲染。宿主应用可以用它定位自定义移动端选区手柄。
 *
 * @param {object} spreadsheet x-spreadsheet 实例，或其内部 `sheet`。
 * @returns {DOMRect | null}
 */
export function selectedRangeClientRect(spreadsheet) {
  const sheet = getSheet(spreadsheet);
  const areaEl = sheet?.selector?.br?.areaEl?.el || sheet?.selector?.br?.areaEl;
  if (!areaEl || areaEl.offsetParent === null) return null;
  return areaEl.getBoundingClientRect();
}

/**
 * 将当前选区扩展到浏览器视口坐标下的单元格。
 *
 * 传入 `options.anchor` 会在扩展选区前临时改变选区锚点。移动端拖拽起点手柄时可固定选区终点，拖拽终点手柄时可固定选区起点。
 *
 * @param {object} spreadsheet x-spreadsheet 实例，或其内部 `sheet`。
 * @param {number} clientX 浏览器视口 x 坐标。
 * @param {number} clientY 浏览器视口 y 坐标。
 * @param {{moving?: boolean, anchor?: {ri: number, ci: number}}} [options]
 * @returns {{ri: number, ci: number, range: object} | null}
 */
export function selectRangeEndByClientPoint(spreadsheet, clientX, clientY, options = {}) {
  const sheet = getSheet(spreadsheet);
  const cellRect = cellRectByClientPoint(spreadsheet, clientX, clientY);
  if (!sheet || !cellRect || cellRect.ri < 0 || cellRect.ci < 0) return null;

  const moving = options.moving !== false;
  if (options.anchor) setSelectionAnchor(sheet, options.anchor);
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

/**
 * 根据宿主 spreadsheet 暴露的生命周期方法执行 resize 或重新渲染。
 *
 * @param {object} spreadsheet x-spreadsheet 实例。
 * @returns {object} spreadsheet 实例或其 resize 方法返回值。
 */
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

/**
 * 在宿主元素上挂载移动端手势适配器。
 *
 * 适配包只维护 pointer 状态。底部编辑器、菜单、缩放 transform 和选区手柄等视觉 UI 由宿主应用控制。所有手势都通过回调暴露，因此适配包不绑定固定产品设计。
 *
 * @param {object} options 适配器参数。
 * @param {object} options.spreadsheet x-spreadsheet 实例。
 * @param {HTMLElement} options.target 接收 pointer 事件的元素。
 * @param {Function} [options.getSelected] 返回宿主选区状态。
 * @param {Function} [options.onSingleTap] 确认单击后调用。
 * @param {Function} [options.onDoubleTap] 确认双击后调用。
 * @param {Function} [options.onLongPress] 长按达到阈值后调用。
 * @param {Function} [options.onRangeDragStart] 选区拖拽激活时调用。
 * @param {Function} [options.onRangeDragMove] 活跃选区拖拽移动时调用。
 * @param {Function} [options.onRangeDragEnd] 选区拖拽结束时调用。
 * @param {Function} [options.onPinchStart] 两个活跃 pointer 开始捏合时调用。
 * @param {Function} [options.onPinchMove] 捏合过程中带缩放增量调用。
 * @param {Function} [options.onPinchEnd] 捏合结束时调用。
 * @param {Function} [options.isSelectionHandle] 检测可拖拽选区手柄。
 * @param {number} [options.longPressMs=550] 长按阈值。
 * @param {number} [options.tapMoveTolerance=10] 点击允许的移动距离。
 * @param {number} [options.dragStartTolerance=14] 进入选区拖拽前需要达到的移动距离。
 * @param {number} [options.doubleTapMs=320] 双击时间窗口。
 * @param {number} [options.doubleTapTolerance=24] 双击距离窗口。
 * @param {boolean} [options.edgeScroll=true] 选区拖拽靠近边缘时是否自动滚动。
 * @param {number} [options.edgeSize=42] 边缘触发区域大小，单位为 CSS 像素。
 * @param {number} [options.edgeMaxSpeed=18] 每帧最大自动滚动速度。
 * @returns {{destroy: Function}} 适配器控制器。
 */
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
    isSelectionHandle = event => event.target?.closest?.('[data-mobile-selection-handle]'),
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

  const state = {
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

  function getHandleDrag(event) {
    const handle = isSelectionHandle?.(event);
    if (!handle) return null;
    const range = getSelectedRange(spreadsheet);
    const endpoints = getRangeStartEnd(range);
    if (!endpoints) return null;
    const role = handle.dataset?.mobileSelectionHandle || handle.getAttribute?.('data-mobile-selection-handle') || 'end';
    // 拖拽某个手柄时，将对角固定为选区锚点。
    return {
      handle,
      role,
      anchor: role === 'start' ? endpoints.end : endpoints.start,
    };
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

  function updateEdgeScroll(event) {
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

  function finishRangeDrag(event) {
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
