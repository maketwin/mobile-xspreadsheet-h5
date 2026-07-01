import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  cellRectByClientPoint,
  getSelectedRange,
  mountMobileSpreadsheetAdapter,
  resizeSpreadsheet,
  selectedRangeClientRect,
  selectedRangeIncludes,
  selectRangeEndByClientPoint,
} from './index.ts';

function makeRange(sri, sci, eri, eci) {
  return {
    sri,
    sci,
    eri,
    eci,
    includes: (ri, ci) => ri >= sri && ri <= eri && ci >= sci && ci <= eci,
  };
}

function makeOverlayRect({
  left = 10,
  top = 20,
  width = 200,
  height = 100,
  offsetWidth = 400,
  offsetHeight = 200,
} = {}) {
  return {
    offsetWidth,
    offsetHeight,
    getBoundingClientRect: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    }),
  };
}

function makeTarget() {
  const handlers = {};
  return {
    handlers,
    addEventListener: vi.fn((type, handler) => {
      handlers[type] = handler;
    }),
    removeEventListener: vi.fn((type, handler) => {
      if (handlers[type] === handler) delete handlers[type];
    }),
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: 320,
      bottom: 480,
      width: 320,
      height: 480,
    }),
  };
}

function makePointerEvent({
  pointerId = 1,
  clientX = 10,
  clientY = 10,
  pointerType = 'touch',
  button = 0,
  target = {},
} = {}) {
  return {
    pointerId,
    clientX,
    clientY,
    pointerType,
    button,
    target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

function makeSpreadsheet({
  range = makeRange(1, 1, 1, 1),
  overlay = makeOverlayRect(),
  cellResolver,
} = {}) {
  const calls = {
    setEnd: [],
    setIndexes: [],
    trigger: [],
    render: 0,
    toolbarReset: 0,
  };
  const dataSelector = {
    range,
    ri: range.sri,
    ci: range.sci,
    setIndexes: vi.fn((ri, ci) => {
      calls.setIndexes.push([ri, ci]);
      dataSelector.ri = ri;
      dataSelector.ci = ci;
    }),
  };
  const selector = {
    range,
    indexes: [range.sri, range.sci],
    moveIndexes: [range.sri, range.sci],
    br: {
      areaEl: {
        el: {
          offsetParent: {},
          getBoundingClientRect: () => ({
            left: 40,
            top: 50,
            right: 120,
            bottom: 90,
            width: 80,
            height: 40,
          }),
        },
      },
    },
    setEnd: vi.fn((ri, ci, moving) => {
      calls.setEnd.push([ri, ci, moving]);
      const anchorRi = dataSelector.ri;
      const anchorCi = dataSelector.ci;
      const nextRange = makeRange(
        Math.min(anchorRi, ri),
        Math.min(anchorCi, ci),
        Math.max(anchorRi, ri),
        Math.max(anchorCi, ci),
      );
      selector.range = nextRange;
      dataSelector.range = nextRange;
    }),
  };
  const sheet = {
    overlayerEl: { el: overlay },
    selector,
    data: {
      selector: dataSelector,
      getCellRectByXY: vi.fn((x, y) => {
        if (cellResolver) return cellResolver(x, y);
        return {
          ri: Math.floor(y / 40),
          ci: Math.floor(x / 80),
          left: x,
          top: y,
          width: 80,
          height: 40,
        };
      }),
      getCell: vi.fn((ri, ci) => ({ text: `${ri}:${ci}` })),
    },
    trigger: vi.fn((...args) => calls.trigger.push(args)),
    toolbar: {
      reset: vi.fn(() => {
        calls.toolbarReset += 1;
      }),
    },
    table: {
      render: vi.fn(() => {
        calls.render += 1;
      }),
    },
    horizontalScrollbar: {
      scroll: vi.fn(() => ({ left: 0 })),
      move: vi.fn(),
    },
    verticalScrollbar: {
      scroll: vi.fn(() => ({ top: 0 })),
      move: vi.fn(),
    },
  };
  return {
    spreadsheet: { sheet },
    sheet,
    calls,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout,
    requestAnimationFrame: callback => setTimeout(callback, 16),
    cancelAnimationFrame: id => clearTimeout(id),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('mobile-spreadsheet-adapter 坐标和选区 helper', () => {
  it('按渲染缩放比例把视口坐标转换为单元格坐标', () => {
    const { spreadsheet, sheet } = makeSpreadsheet();

    const rect = cellRectByClientPoint(spreadsheet, 60, 45);

    expect(sheet.data.getCellRectByXY).toHaveBeenCalledWith(100, 50);
    expect(rect).toMatchObject({ ri: 1, ci: 1, left: 100, top: 50 });
  });

  it('读取并判断当前选区', () => {
    const range = makeRange(2, 3, 4, 5);
    const { spreadsheet } = makeSpreadsheet({ range });

    expect(getSelectedRange(spreadsheet)).toBe(range);
    expect(selectedRangeIncludes(spreadsheet, 3, 4)).toBe(true);
    expect(selectedRangeIncludes(spreadsheet, 1, 4)).toBe(false);
  });

  it('返回当前选区的 DOM 矩形', () => {
    const { spreadsheet } = makeSpreadsheet();

    expect(selectedRangeClientRect(spreadsheet)).toMatchObject({
      left: 40,
      top: 50,
      right: 120,
      bottom: 90,
    });
  });

  it('扩展选区并触发表格既有事件和渲染路径', () => {
    const { spreadsheet, calls } = makeSpreadsheet();

    const result = selectRangeEndByClientPoint(spreadsheet, 170, 90);

    expect(calls.setEnd).toEqual([[3, 4, true]]);
    expect(calls.trigger).toHaveLength(1);
    expect(calls.toolbarReset).toBe(1);
    expect(calls.render).toBe(1);
    expect(result).toMatchObject({ ri: 3, ci: 4 });
    expect(result.range).toMatchObject({ sri: 1, sci: 1, eri: 3, eci: 4 });
  });

  it('传入锚点时先同步 selector 再扩展选区', () => {
    const { spreadsheet, calls } = makeSpreadsheet({ range: makeRange(1, 1, 3, 3) });

    selectRangeEndByClientPoint(spreadsheet, 10, 20, {
      anchor: { ri: 3, ci: 3 },
      moving: false,
    });

    expect(calls.setIndexes).toEqual([[3, 3]]);
    expect(calls.setEnd).toEqual([[0, 0, false]]);
    expect(getSelectedRange(spreadsheet)).toMatchObject({ sri: 0, sci: 0, eri: 3, eci: 3 });
  });

  it('按 resize、reload、reRender 优先级桥接表格重排', () => {
    const resizeTarget = { resize: vi.fn(() => 'resized'), reload: vi.fn(), reRender: vi.fn() };
    const reloadTarget = { reload: vi.fn(() => 'reloaded'), reRender: vi.fn() };
    const renderTarget = { reRender: vi.fn(() => 'rendered') };

    expect(resizeSpreadsheet(resizeTarget)).toBe('resized');
    expect(resizeTarget.reload).not.toHaveBeenCalled();
    expect(resizeSpreadsheet(reloadTarget)).toBe('reloaded');
    expect(reloadTarget.reRender).not.toHaveBeenCalled();
    expect(resizeSpreadsheet(renderTarget)).toBe('rendered');
  });
});

describe('mountMobileSpreadsheetAdapter 手势状态机', () => {
  it('稳定点击触发单击，连续同一单元格点击触发双击', () => {
    const { spreadsheet } = makeSpreadsheet();
    const target = makeTarget();
    const onSingleTap = vi.fn();
    const onDoubleTap = vi.fn();

    mountMobileSpreadsheetAdapter({
      spreadsheet,
      target,
      getSelected: () => ({ ri: 1, ci: 1 }),
      onSingleTap,
      onDoubleTap,
    });

    target.handlers.pointerdown(makePointerEvent({ clientX: 90, clientY: 70 }));
    target.handlers.pointerup(makePointerEvent({ clientX: 90, clientY: 70 }));
    vi.advanceTimersByTime(100);
    target.handlers.pointerdown(makePointerEvent({ clientX: 92, clientY: 72 }));
    target.handlers.pointerup(makePointerEvent({ clientX: 92, clientY: 72 }));

    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });

  it('长按超过阈值触发长按并阻止后续点击', () => {
    const { spreadsheet } = makeSpreadsheet();
    const target = makeTarget();
    const onLongPress = vi.fn();
    const onSingleTap = vi.fn();

    mountMobileSpreadsheetAdapter({
      spreadsheet,
      target,
      getSelected: () => ({ ri: 1, ci: 1 }),
      onLongPress,
      onSingleTap,
      longPressMs: 500,
    });

    const downEvent = makePointerEvent({ clientX: 90, clientY: 70 });
    target.handlers.pointerdown(downEvent);
    vi.advanceTimersByTime(501);
    target.handlers.pointerup(makePointerEvent({ clientX: 90, clientY: 70 }));

    expect(onLongPress).toHaveBeenCalledWith(downEvent);
    expect(onSingleTap).not.toHaveBeenCalled();
  });

  it('在已选区域内拖动会扩展选区并触发拖拽回调', () => {
    const { spreadsheet, calls } = makeSpreadsheet({ range: makeRange(1, 1, 1, 1) });
    const target = makeTarget();
    const onRangeDragStart = vi.fn();
    const onRangeDragMove = vi.fn();
    const onRangeDragEnd = vi.fn();

    mountMobileSpreadsheetAdapter({
      spreadsheet,
      target,
      getSelected: () => ({ ri: 1, ci: 1, range: getSelectedRange(spreadsheet) }),
      onRangeDragStart,
      onRangeDragMove,
      onRangeDragEnd,
      dragStartTolerance: 8,
    });

    target.handlers.pointerdown(makePointerEvent({ clientX: 50, clientY: 40 }));
    const moveEvent = makePointerEvent({ clientX: 250, clientY: 140 });
    target.handlers.pointermove(moveEvent);
    target.handlers.pointerup(makePointerEvent({ clientX: 250, clientY: 140 }));

    expect(moveEvent.preventDefault).toHaveBeenCalled();
    expect(calls.setEnd.at(-1)).toEqual([6, 6, false]);
    expect(onRangeDragStart).toHaveBeenCalledTimes(1);
    expect(onRangeDragMove).toHaveBeenCalledTimes(1);
    expect(onRangeDragEnd).toHaveBeenCalledTimes(1);
  });

  it('拖拽起点手柄时固定选区终点作为锚点', () => {
    const { spreadsheet, calls } = makeSpreadsheet({ range: makeRange(1, 1, 3, 3) });
    const target = makeTarget();
    const handle = {
      dataset: { mobileSelectionHandle: 'start' },
      getAttribute: vi.fn(() => 'start'),
      closest: vi.fn(() => handle),
    };

    mountMobileSpreadsheetAdapter({
      spreadsheet,
      target,
      getSelected: () => ({ range: getSelectedRange(spreadsheet) }),
      dragStartTolerance: 1,
    });

    const downEvent = makePointerEvent({ clientX: 120, clientY: 100, target: handle });
    target.handlers.pointerdown(downEvent);
    target.handlers.pointermove(makePointerEvent({ clientX: 10, clientY: 20, target: handle }));
    target.handlers.pointerup(makePointerEvent({ clientX: 10, clientY: 20, target: handle }));

    expect(downEvent.preventDefault).toHaveBeenCalled();
    expect(downEvent.stopPropagation).toHaveBeenCalled();
    expect(calls.setIndexes.at(0)).toEqual([3, 3]);
    expect(calls.setEnd.at(-1)).toEqual([0, 0, false]);
  });

  it('双指移动触发捏合缩放回调', () => {
    const { spreadsheet } = makeSpreadsheet();
    const target = makeTarget();
    const onPinchStart = vi.fn();
    const onPinchMove = vi.fn();
    const onPinchEnd = vi.fn();

    mountMobileSpreadsheetAdapter({
      spreadsheet,
      target,
      getSelected: () => ({ ri: 1, ci: 1 }),
      onPinchStart,
      onPinchMove,
      onPinchEnd,
    });

    target.handlers.pointerdown(makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }));
    target.handlers.pointerdown(makePointerEvent({ pointerId: 2, clientX: 0, clientY: 100 }));
    const moveEvent = makePointerEvent({ pointerId: 2, clientX: 0, clientY: 150 });
    target.handlers.pointermove(moveEvent);
    target.handlers.pointerup(makePointerEvent({ pointerId: 2, clientX: 0, clientY: 150 }));

    expect(onPinchStart).toHaveBeenCalledWith(expect.objectContaining({ startDistance: 100 }), expect.any(Object));
    expect(onPinchMove).toHaveBeenCalledWith(expect.objectContaining({ currentDistance: 150, scaleDelta: 1.5 }), moveEvent);
    expect(onPinchEnd).toHaveBeenCalledTimes(1);
    expect(moveEvent.preventDefault).toHaveBeenCalled();
  });

  it('destroy 会移除监听并清理动画状态', () => {
    const { spreadsheet } = makeSpreadsheet();
    const target = makeTarget();

    const adapter = mountMobileSpreadsheetAdapter({ spreadsheet, target });
    adapter.destroy();

    expect(target.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(target.removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(target.removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(target.removeEventListener).toHaveBeenCalledWith('pointercancel', expect.any(Function));
  });
});
