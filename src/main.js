import Spreadsheet from './vendor/x-spreadsheet';
import {
  mountMobileSpreadsheetAdapter,
  resizeSpreadsheet,
  selectedRangeClientRect,
} from '../packages/mobile-spreadsheet-adapter/src/index.js';
import './styles.css';

const app = document.querySelector('#app');

app.innerHTML = `
  <div class="mobile-excel">
    <header class="topbar">
      <button class="icon-button" type="button" aria-label="返回">‹</button>
      <div class="title-block">
        <strong>前端排期表-2025</strong>
        <span id="zoomText">100%</span>
      </div>
      <div class="top-actions">
        <button class="perf-button" type="button" data-perf-rows="1000">1k</button>
        <button class="perf-button" type="button" data-perf-rows="5000">5k</button>
        <button class="icon-button muted" type="button" aria-label="撤销">↶</button>
        <button class="icon-button muted" type="button" aria-label="重做">↷</button>
        <button class="icon-button" type="button" id="resetZoom" aria-label="重置缩放">□</button>
        <button class="icon-button" type="button" aria-label="更多">⋯</button>
      </div>
    </header>

    <main class="sheet-viewport" id="gestureLayer">
      <div class="sheet-scale" id="scaleLayer">
        <div id="xspreadsheet"></div>
      </div>
      <div class="gesture-tip" id="gestureTip">双指捏合可缩放，单指拖动可浏览表格</div>
      <div class="perf-panel hidden" id="perfPanel" aria-live="polite"></div>
      <div class="selection-handles hidden" id="selectionHandles" aria-hidden="true">
        <button class="selection-handle start" type="button" data-mobile-selection-handle="start" aria-label="拖动调整选区起点"></button>
        <button class="selection-handle end" type="button" data-mobile-selection-handle="end" aria-label="拖动调整选区终点"></button>
      </div>
      <div class="long-press-menu hidden" id="longPressMenu" role="menu" aria-label="单元格快捷菜单">
        <div class="menu-title">
          <strong id="menuCellAddress">C2</strong>
          <span id="menuCellText">郭绵翔</span>
        </div>
        <div class="menu-actions">
          <button type="button" data-menu-action="edit">编辑</button>
          <button type="button" data-menu-action="copy">复制</button>
          <button type="button" data-menu-action="clear">清空</button>
          <button type="button" data-menu-action="text">文本</button>
          <button type="button" data-menu-action="date">日期</button>
          <button type="button" data-menu-action="zoom-in">放大</button>
          <button type="button" data-menu-action="zoom-out">缩小</button>
        </div>
      </div>
    </main>

    <section class="cell-editor" id="cellEditor" aria-label="移动端单元格编辑器" style="display: none;">
      <div class="editor-meta">
        <span id="cellAddress">未选择</span>
        <span id="cellType">文本</span>
      </div>
      <div class="input-row" id="textEditor">
        <input id="cellInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="点击单元格后编辑">
        <button class="small-button" type="button" id="cancelEdit">取消</button>
        <button class="small-button primary" type="button" id="saveEdit">确定</button>
      </div>
      <div class="date-editor hidden" id="dateEditor">
        <input id="dateInput" type="date">
        <button class="small-button" type="button" id="cancelDate">取消</button>
        <button class="small-button primary" type="button" id="saveDate">确定</button>
      </div>
      <nav class="editor-toolbar" aria-label="编辑工具栏">
        <button type="button" data-editor="text">文本</button>
        <button type="button" data-editor="number">数字</button>
        <button type="button" data-editor="date">日期</button>
        <button type="button" id="focusEditor">编辑</button>
        <button type="button" id="zoomOut">－</button>
        <button type="button" id="zoomIn">＋</button>
      </nav>
    </section>
  </div>
`;

const els = {
  appShell: document.querySelector('.mobile-excel'),
  topbar: document.querySelector('.topbar'),
  gestureLayer: document.querySelector('#gestureLayer'),
  scaleLayer: document.querySelector('#scaleLayer'),
  zoomText: document.querySelector('#zoomText'),
  gestureTip: document.querySelector('#gestureTip'),
  perfPanel: document.querySelector('#perfPanel'),
  selectionHandles: document.querySelector('#selectionHandles'),
  selectionStartHandle: document.querySelector('[data-mobile-selection-handle="start"]'),
  selectionEndHandle: document.querySelector('[data-mobile-selection-handle="end"]'),
  longPressMenu: document.querySelector('#longPressMenu'),
  menuCellAddress: document.querySelector('#menuCellAddress'),
  menuCellText: document.querySelector('#menuCellText'),
  cellEditor: document.querySelector('#cellEditor'),
  cellAddress: document.querySelector('#cellAddress'),
  cellType: document.querySelector('#cellType'),
  cellInput: document.querySelector('#cellInput'),
  dateInput: document.querySelector('#dateInput'),
  textEditor: document.querySelector('#textEditor'),
  dateEditor: document.querySelector('#dateEditor'),
};

const state = {
  spreadsheet: null,
  mobileAdapter: null,
  selected: { ri: 0, ci: 0, text: '' },
  editorType: 'text',
  isEditing: false,
  scale: 1,
  baseScale: 1,
  isPinching: false,
  keyboardOffset: 0,
  editorHeight: 132,
  viewportRaf: 0,
  viewportTimer: 0,
  handleRaf: 0,
  keyboardSyncTimers: [],
  lastViewportSize: null,
  perfMetrics: null,
};

const columns = ['项目组', '版本', '负责人', '系统', '需求说明', '日期', '状态'];
const rows = [
  ['移动组', '0.3', '郭绵翔', 'OA', '云OA与工作桶解耦', '2026-06-08', '进行中'],
  ['移动组', '0.1', '李良国', '回放', '回放24-O1、O2、O3', '2026-06-09', '已完成'],
  ['移动组', '0.3', '郭绵翔', 'OA', '工作桶支持文件下载', '2026-06-10', '进行中'],
  ['移动组', '0.3', '郭绵翔', '应用市场', '工作桶 targetSdkVersion 调整', '2026-06-11', '待确认'],
  ['移动组', '0.3', '郭绵翔', 'OA', '工单新增时间选择框', '2026-06-12', '待确认'],
  ['移动组', '0.2', '涂辉', 'MES', 'PAD检验数量支持小数', '2026-06-13', '风险'],
  ['移动组', '0.2', '涂辉', 'MES', '流量统计（文件最新使用）', '2026-06-14', '进行中'],
  ['移动组', '0.2', '涂辉', 'OA', 'Android 支持附件预览', '2026-06-15', '进行中'],
  ['移动组', '0.3', '郭绵翔', 'MES', 'MES审批待办', '2026-06-16', '已完成'],
  ['移动组', '0.3', '郭绵翔', 'OA', '添加模拟考试和考试分析', '2026-06-17', '进行中'],
  ['WEB一组', '1.1', '李星达', '崩溃', 'mes表格替换ali-table', '2026-06-18', '风险'],
  ['WEB一组', '1.1', '李星达', 'AI代码生成', '业务组件标准化', '2026-06-19', '进行中'],
  ['WEB一组', '1.2', '吕俊伶', 'MES', '异常报错修复', '2026-06-20', '待确认'],
  ['WEB一组', '1.3', '魏伟剑', 'MES', 'BOM工具相关需求', '2026-06-21', '进行中'],
  ['WEB一组', '1.4', '冯亦磊', 'ERP', 'ERP产品线独立', '2026-06-22', '已完成'],
];

function buildSheetData() {
  const cells = {};
  cells[0] = {};
  columns.forEach((text, ci) => {
    cells[0][ci] = { text, style: 1 };
  });

  rows.forEach((row, ri) => {
    const rowCells = {};
    row.forEach((text, ci) => {
      rowCells[ci] = {
        text,
        style: ci === 5 ? 2 : 0,
      };
    });
    cells[ri + 1] = rowCells;
  });

  return {
    name: '前端排期表',
    freeze: 'A2',
    styles: [
      { align: 'center', valign: 'middle' },
      { bgcolor: '#eef5ff', color: '#1677ff', bold: true, align: 'center' },
      { color: '#087a5a', align: 'center' },
    ],
    rows: { len: 120, cells },
    cols: {
      len: 26,
      0: { width: 92 },
      1: { width: 70 },
      2: { width: 94 },
      3: { width: 92 },
      4: { width: 260 },
      5: { width: 112 },
      6: { width: 92 },
    },
  };
}

function buildLargeSheetData(rowCount = 1000, colCount = 50) {
  const cells = {};
  const statusValues = ['进行中', '待确认', '已完成', '风险'];
  const systems = ['OA', 'MES', 'ERP', '回放', '应用市场', 'AI代码生成'];
  const owners = ['郭绵翔', '李良国', '涂辉', '李星达', '吕俊伶', '魏伟剑', '冯亦磊'];
  const statusStyleMap = {
    进行中: 4,
    待确认: 5,
    已完成: 6,
    风险: 7,
  };

  cells[0] = {};
  for (let ci = 0; ci < colCount; ci += 1) {
    cells[0][ci] = { text: ci < columns.length ? columns[ci] : `字段${ci + 1}`, style: 1 };
  }

  for (let ri = 1; ri < rowCount; ri += 1) {
    const rowCells = {};
    for (let ci = 0; ci < colCount; ci += 1) {
      let text = '';
      let style = 0;
      if (ri % 2 === 0) style = 3;
      if (ci === 0) {
        text = ri % 3 === 0 ? '移动组' : ri % 3 === 1 ? 'WEB一组' : '平台组';
        style = 8 + (ri % 3);
      } else if (ci === 1) {
        text = `${(ri % 6) + 1}.${ci % 4}`;
        style = 11;
      } else if (ci === 2) {
        text = owners[ri % owners.length];
        style = 12;
      } else if (ci === 3) {
        text = systems[ri % systems.length];
        style = 13;
      } else if (ci === 4) {
        text = `性能测试需求-${ri}-${ci}`;
        style = ri % 5 === 0 ? 14 : style;
      }
      else if (ci === 5) {
        text = `2026-06-${String((ri % 28) + 1).padStart(2, '0')}`;
        style = 2;
      } else if (ci === 6) {
        text = statusValues[ri % statusValues.length];
        style = statusStyleMap[text];
      } else if (ci % 12 === 0 && ri > 2) {
        text = `=SUM(B${ri}:C${ri})`;
        style = 15;
      } else {
        text = `${ri}-${ci}`;
        if (ci % 8 === 0) style = 16;
        if (ci % 10 === 0) style = 17;
      }
      rowCells[ci] = { text, style };
    }
    cells[ri] = rowCells;
  }

  return {
    name: `性能测试 ${rowCount}x${colCount}`,
    freeze: 'A2',
    styles: [
      { align: 'center', valign: 'middle' },
      {
        bgcolor: '#e8f1ff',
        color: '#1455d9',
        font: { bold: true },
        align: 'center',
        border: { bottom: ['medium', '#9bbcf7'] },
      },
      { color: '#087a5a', align: 'center' },
      { bgcolor: '#f8fafc', color: '#334155', align: 'center' },
      { bgcolor: '#e8f7ee', color: '#087a5a', font: { bold: true }, align: 'center' },
      { bgcolor: '#fff7e6', color: '#b25e09', font: { bold: true }, align: 'center' },
      { bgcolor: '#eaf2ff', color: '#175cd3', font: { bold: true }, align: 'center' },
      { bgcolor: '#fff1f2', color: '#b42318', font: { bold: true }, align: 'center' },
      { bgcolor: '#edf7ff', color: '#175cd3', align: 'center' },
      { bgcolor: '#f0fdf4', color: '#15803d', align: 'center' },
      { bgcolor: '#fef3c7', color: '#92400e', align: 'center' },
      { color: '#475467', align: 'center' },
      { color: '#344054', font: { bold: true }, align: 'center' },
      { bgcolor: '#f7f5ff', color: '#6941c6', align: 'center' },
      { bgcolor: '#fff', color: '#111827', align: 'left', textwrap: true },
      { bgcolor: '#f1f5f9', color: '#475467', align: 'right' },
      { color: '#0f766e', align: 'right' },
      { color: '#7c3aed', font: { italic: true }, align: 'center' },
    ],
    rows: { len: rowCount, cells },
    cols: {
      len: colCount,
      0: { width: 92 },
      1: { width: 70 },
      2: { width: 94 },
      3: { width: 92 },
      4: { width: 260 },
      5: { width: 112 },
      6: { width: 92 },
    },
  };
}

function resetPerfMetrics() {
  state.perfMetrics = {
    renderCount: 0,
    renderTotal: 0,
    renderMax: 0,
  };
}

function installPerfHooks() {
  const table = state.spreadsheet?.sheet?.table;
  if (!table || table.render.__perfWrapped) return;
  const rawRender = table.render.bind(table);
  table.render = (...args) => {
    const start = performance.now();
    const result = rawRender(...args);
    const duration = performance.now() - start;
    if (state.perfMetrics) {
      state.perfMetrics.renderCount += 1;
      state.perfMetrics.renderTotal += duration;
      state.perfMetrics.renderMax = Math.max(state.perfMetrics.renderMax, duration);
    }
    return result;
  };
  table.render.__perfWrapped = true;
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function formatMs(value) {
  return `${value.toFixed(1)}ms`;
}

function updatePerfPanel(result, running = false) {
  if (!els.perfPanel) return;
  els.perfPanel.classList.remove('hidden');
  if (running) {
    els.perfPanel.textContent = `性能测试运行中：${result.rows} x ${result.cols}`;
    return;
  }
  els.perfPanel.innerHTML = `
    <strong>${result.rows} x ${result.cols}</strong>
    <span>生成 ${formatMs(result.generateMs)}</span>
    <span>加载 ${formatMs(result.loadMs)}</span>
    <span>滚动 ${formatMs(result.scrollMs)}</span>
    <span>渲染 ${result.renderCount} 次 / 总 ${formatMs(result.renderTotal)} / 峰值 ${formatMs(result.renderMax)}</span>
  `;
}

async function runSpreadsheetPerf(rowCount = 1000, colCount = 50) {
  installPerfHooks();
  const result = { rows: rowCount, cols: colCount };
  updatePerfPanel(result, true);
  await nextFrame();

  resetPerfMetrics();
  let start = performance.now();
  const data = buildLargeSheetData(rowCount, colCount);
  result.generateMs = performance.now() - start;

  start = performance.now();
  state.spreadsheet.loadData(data);
  result.loadMs = performance.now() - start;
  await nextFrame();

  const scrollStart = performance.now();
  const { sheet } = state.spreadsheet;
  const { data: sheetData } = sheet;
  const step = Math.max(120, Math.floor((rowCount * 30) / 30));
  for (let i = 1; i <= 30; i += 1) {
    sheetData.scrolly(i * step, () => {
      sheet.table.render();
    });
  }
  result.scrollMs = performance.now() - scrollStart;
  result.scrollTargetPx = step * 30;

  Object.assign(result, state.perfMetrics);
  updatePerfPanel(result);
  showGestureTip(`性能测试完成：${rowCount} x ${colCount}`);
  window.__lastSpreadsheetPerf = result;
  return result;
}

function initSpreadsheet() {
  state.spreadsheet = new Spreadsheet('#xspreadsheet', {
    mode: 'edit',
    mobile: true,
    showToolbar: false,
    showContextmenu: false,
    showBottomBar: false,
    view: {
      height: () => getSheetViewportSize().height,
      width: () => getSheetViewportSize().width,
    },
    row: { len: 120, height: 30 },
    col: { len: 26, width: 100, indexWidth: 52, minWidth: 52 },
    style: {
      align: 'center',
      valign: 'middle',
      textwrap: false,
      color: '#111827',
      font: { name: 'Helvetica', size: 10, bold: false, italic: false },
    },
  });

  state.spreadsheet.loadData(buildSheetData());
  installPerfHooks();
  state.spreadsheet.on('cell-selected', (cell, ri, ci) => {
    updateSelection(cell, ri, ci);
  });
  state.spreadsheet.on('cells-selected', (cell, range) => {
    updateRangeSelection(cell, range);
  });
  state.spreadsheet.on('cell-edited', (text, ri, ci) => {
    updateSelection({ text }, ri, ci);
  });

  state.spreadsheet.sheet?.selector?.set?.(1, 2);
  state.spreadsheet.sheet?.table?.render?.();
  updateSelection({ text: rows[0][2] }, 1, 2);
  scheduleViewportUpdate();
}

function formatCellAddress(ri, ci) {
  return `${toColumnName(ci)}${ri + 1}`;
}

function formatRangeAddress(range) {
  if (!range) return '未选择';
  const start = formatCellAddress(range.sri, range.sci);
  const end = formatCellAddress(range.eri, range.eci);
  return start === end ? start : `${start}:${end}`;
}

function updateSelection(cell, ri, ci) {
  const text = cell?.text ?? '';
  state.selected = { ri, ci, text, range: null };
  els.cellAddress.textContent = formatCellAddress(ri, ci);
  els.cellInput.value = text;
  els.dateInput.value = normalizeDate(text);

  if (ci === 5 || /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    setEditorType('date', false);
  } else if (ci === 1) {
    setEditorType('number', false);
  } else {
    setEditorType('text', false);
  }
  syncLongPressMenuContent();
  scheduleSelectionHandleUpdate();
}

function updateRangeSelection(cell, range) {
  const text = cell?.text ?? '';
  state.selected = {
    ri: range.sri,
    ci: range.sci,
    text,
    range,
  };
  els.cellAddress.textContent = formatRangeAddress(range);
  els.cellInput.value = text;
  els.dateInput.value = normalizeDate(text);
  syncLongPressMenuContent();
  scheduleSelectionHandleUpdate();
}

function toColumnName(index) {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
}

function normalizeDate(text) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return '2026-06-17';
}

function focusEditorControl(control) {
  if (!control) return;
  control.focus({ preventScroll: true });
  if (control === els.cellInput) {
    const end = control.value.length;
    control.setSelectionRange(end, end);
  }
}

function setEditing(isEditing) {
  state.isEditing = isEditing;
  els.cellEditor.style.display = isEditing ? '' : 'none';
  els.cellEditor.classList.toggle('editing', isEditing);
  document.documentElement.classList.toggle('editing-cell', isEditing);
  if (!isEditing) {
    blurEditors();
    document.documentElement.classList.remove('keyboard-open');
  }
  scheduleViewportUpdate(0, true);
  scheduleSelectionHandleUpdate();
}

function setEditorType(type, focus = true) {
  state.editorType = type;
  document.documentElement.dataset.editorType = type;
  els.cellType.textContent = type === 'date' ? '日期' : type === 'number' ? '数字' : '文本';
  els.textEditor.classList.toggle('hidden', type === 'date');
  els.dateEditor.classList.toggle('hidden', type !== 'date');
  els.cellInput.inputMode = type === 'number' ? 'decimal' : 'text';
  scheduleViewportUpdate();
  if (focus) {
    const target = type === 'date' ? els.dateInput : els.cellInput;
    focusEditorControl(target);
    requestAnimationFrame(() => {
      focusEditorControl(target);
      scheduleViewportUpdate();
      scheduleViewportUpdate(180);
    });
  }
}

function saveText() {
  const value = els.cellInput.value;
  commitValue(value);
}

function saveDate() {
  commitValue(els.dateInput.value);
}

function commitValue(value) {
  const { ri, ci } = state.selected;
  state.spreadsheet.cellText(ri, ci, value).reRender();
  updateSelection({ text: value }, ri, ci);
  setEditing(false);
  hideLongPressMenu();
  scheduleViewportUpdate();
}

function blurEditors() {
  els.cellInput.blur();
  els.dateInput.blur();
}

function cancelEdit() {
  els.cellInput.value = state.selected.text;
  els.dateInput.value = normalizeDate(state.selected.text);
  setEditing(false);
}

function enterEditMode() {
  hideLongPressMenu();
  setEditing(true);
  setEditorType(state.editorType, true);
  // 移动端 WebView 往往会分阶段上报键盘视口变化。这里短时间多次同步，让底部编辑器和表格 canvas 一起稳定下来。
  scheduleKeyboardSync();
  scheduleViewportUpdate(180, true);
}

async function copySelectedCell() {
  const text = state.selected.text ?? '';
  try {
    await navigator.clipboard.writeText(text);
    showGestureTip('已复制单元格内容');
  } catch {
    els.cellInput.value = text;
    els.cellInput.select();
    showGestureTip('已选中内容，可手动复制');
  }
}

function clearSelectedCell() {
  commitValue('');
  showGestureTip('已清空当前单元格');
}

function setScale(nextScale, { immediate = true, updateViewport = true } = {}) {
  state.scale = Math.min(1.7, Math.max(0.72, nextScale));
  els.scaleLayer.style.transform = `scale(${state.scale})`;
  els.scaleLayer.style.width = `${100 / state.scale}%`;
  els.scaleLayer.style.height = `${100 / state.scale}%`;
  els.zoomText.textContent = `${Math.round(state.scale * 100)}%`;
  hideLongPressMenu();
  scheduleSelectionHandleUpdate();
  if (updateViewport) scheduleViewportUpdate(immediate ? 0 : 90);
}

function handleAdapterSingleTap(event) {
  if (event.target.closest('.long-press-menu')) return;
  hideLongPressMenu();
  if (event.pointerType !== 'mouse' || event.button === 0) {
    setEditing(false);
  }
}

function handleAdapterDoubleTap() {
  enterEditMode();
}

function handleAdapterLongPress(event) {
  showLongPressMenu(event.clientX, event.clientY);
}

function handleAdapterRangeDragStart() {
  hideLongPressMenu();
  setEditing(false);
  els.selectionHandles.classList.add('dragging');
}

function handleAdapterRangeDragEnd() {
  hideLongPressMenu();
  els.selectionHandles.classList.remove('dragging');
  scheduleSelectionHandleUpdate();
}

function handleAdapterPinchStart(pinch) {
  state.baseScale = state.scale;
  state.isPinching = true;
  els.gestureLayer.classList.add('pinching');
  els.gestureTip.classList.add('show');
  pinch.baseScale = state.baseScale;
}

function handleAdapterPinchMove(pinch) {
  setScale((pinch.baseScale || state.baseScale) * pinch.scaleDelta, {
    immediate: false,
    updateViewport: false,
  });
  scheduleSelectionHandleUpdate();
}

function handleAdapterPinchEnd() {
  if (state.isPinching) scheduleViewportUpdate();
  state.isPinching = false;
  els.gestureLayer.classList.remove('pinching');
  setTimeout(() => els.gestureTip.classList.remove('show'), 700);
}

function syncLongPressMenuContent() {
  if (!els.menuCellAddress || !els.menuCellText) return;
  els.menuCellAddress.textContent = state.selected.range
    ? formatRangeAddress(state.selected.range)
    : formatCellAddress(state.selected.ri, state.selected.ci);
  els.menuCellText.textContent = state.selected.text || '空单元格';
}

function showLongPressMenu(clientX, clientY) {
  if (state.isPinching) return;
  syncLongPressMenuContent();
  const shellRect = els.appShell.getBoundingClientRect();
  els.longPressMenu.classList.remove('hidden');
  els.longPressMenu.classList.add('show');

  const menuRect = els.longPressMenu.getBoundingClientRect();
  const padding = 10;
  const x = Math.min(
    Math.max(clientX - shellRect.left - menuRect.width / 2, padding),
    Math.max(padding, shellRect.width - menuRect.width - padding),
  );
  const y = Math.min(
    Math.max(clientY - shellRect.top + 12, padding),
    Math.max(padding, shellRect.height - state.editorHeight - menuRect.height - padding),
  );

  els.longPressMenu.style.left = `${Math.round(x)}px`;
  els.longPressMenu.style.top = `${Math.round(y)}px`;
  showGestureTip('长按菜单已打开');
}

function hideLongPressMenu() {
  els.longPressMenu.classList.remove('show');
  els.longPressMenu.classList.add('hidden');
}

function setHandlePosition(handle, x, y) {
  handle.style.left = `${Math.round(x)}px`;
  handle.style.top = `${Math.round(y)}px`;
}

function updateSelectionHandles() {
  if (!els.selectionHandles || state.isEditing || state.isPinching) {
    els.selectionHandles?.classList.add('hidden');
    return;
  }
  // 选区本身仍由 x-spreadsheet 渲染。demo 只在其上叠加适合移动端触摸的手柄，不改表格渲染器。
  const rect = selectedRangeClientRect(state.spreadsheet);
  const hostRect = els.gestureLayer.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    els.selectionHandles.classList.add('hidden');
    return;
  }

  const left = rect.left - hostRect.left;
  const top = rect.top - hostRect.top;
  const right = rect.right - hostRect.left;
  const bottom = rect.bottom - hostRect.top;
  const hostWidth = hostRect.width;
  const hostHeight = hostRect.height;
  const outOfView = right < 0 || bottom < 0 || left > hostWidth || top > hostHeight;
  if (outOfView) {
    els.selectionHandles.classList.add('hidden');
    return;
  }

  els.selectionHandles.classList.remove('hidden');
  setHandlePosition(els.selectionStartHandle, left, top);
  setHandlePosition(els.selectionEndHandle, right, bottom);
}

function scheduleSelectionHandleUpdate(delay = 0) {
  if (!els.selectionHandles) return;
  cancelAnimationFrame(state.handleRaf);
  if (delay > 0) {
    window.setTimeout(scheduleSelectionHandleUpdate, delay);
    return;
  }
  state.handleRaf = requestAnimationFrame(updateSelectionHandles);
}

function mountAdapter() {
  state.mobileAdapter?.destroy?.();
  state.mobileAdapter = mountMobileSpreadsheetAdapter({
    spreadsheet: state.spreadsheet,
    target: els.gestureLayer,
    getSelected: () => state.selected,
    onSingleTap: handleAdapterSingleTap,
    onDoubleTap: handleAdapterDoubleTap,
    onLongPress: handleAdapterLongPress,
    onRangeDragStart: handleAdapterRangeDragStart,
    onRangeDragMove: () => scheduleSelectionHandleUpdate(),
    onRangeDragEnd: handleAdapterRangeDragEnd,
    onPinchStart: handleAdapterPinchStart,
    onPinchMove: handleAdapterPinchMove,
    onPinchEnd: handleAdapterPinchEnd,
  });
}

function showGestureTip(message) {
  els.gestureTip.textContent = message;
  els.gestureTip.classList.add('show');
  window.setTimeout(() => {
    els.gestureTip.classList.remove('show');
    els.gestureTip.textContent = '双指捏合可缩放，单指拖动可浏览表格';
  }, 1200);
}

function syncKeyboardOffset() {
  const vv = window.visualViewport;
  const mobileViewport = window.matchMedia('(max-width: 739px)').matches;
  // visualViewport 是衡量 iOS Safari 和 Android WebView 软键盘遮挡最可靠的方式。
  const rawOffset = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  const offset = rawOffset;
  state.keyboardOffset = offset;
  document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);
  const editorFocused = document.activeElement === els.cellInput || document.activeElement === els.dateInput;
  document.documentElement.classList.toggle('keyboard-open', mobileViewport && (editorFocused || offset > 80 || (vv && vv.height < window.innerHeight - 80)));
  if (mobileViewport && window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
  scheduleViewportUpdate();
}

function scheduleKeyboardSync() {
  state.keyboardSyncTimers.forEach(timer => window.clearTimeout(timer));
  state.keyboardSyncTimers = [0, 80, 180, 320].map(delay => window.setTimeout(() => {
    syncKeyboardOffset();
    scheduleViewportUpdate(0, true);
  }, delay));
}

function getVisibleAppHeight() {
  const vv = window.visualViewport;
  if (vv && window.matchMedia('(max-width: 739px)').matches) {
    return Math.min(vv.height, els.appShell.clientHeight || vv.height);
  }
  return els.appShell.clientHeight || window.innerHeight;
}

function getSheetViewportSize() {
  const topbarHeight = els.topbar.getBoundingClientRect().height || 64;
  const editorHeight = state.isEditing
    ? (state.editorHeight || els.cellEditor.getBoundingClientRect().height || 132)
    : 0;
  const appWidth = els.appShell.clientWidth || window.innerWidth;
  const visibleHeight = getVisibleAppHeight();
  const availableHeight = visibleHeight - topbarHeight - editorHeight - 6;

  return {
    // 表格由宿主层缩放，因此内部 canvas 需要使用反向逻辑尺寸，保证坐标和渲染对齐。
    width: Math.max(320, Math.floor(appWidth / state.scale)),
    height: Math.max(220, Math.floor(availableHeight / state.scale)),
  };
}

function updateEditorMetrics() {
  if (!state.isEditing) {
    state.editorHeight = 0;
    document.documentElement.style.setProperty('--editor-height', '0px');
    els.gestureLayer.style.paddingBottom = '0px';
    return;
  }
  const rect = els.cellEditor.getBoundingClientRect();
  state.editorHeight = Math.ceil(rect.height);
  document.documentElement.style.setProperty('--editor-height', `${state.editorHeight}px`);
  els.gestureLayer.style.paddingBottom = `${state.editorHeight + 10}px`;
}

function viewportSizeChanged(size) {
  const last = state.lastViewportSize;
  return !last || last.width !== size.width || last.height !== size.height;
}

function scheduleViewportUpdate(delay = 0, force = false) {
  if (delay > 0) {
    window.clearTimeout(state.viewportTimer);
    state.viewportTimer = window.setTimeout(() => {
      state.viewportTimer = 0;
      scheduleViewportUpdate(0, force);
    }, delay);
    return;
  }
  window.clearTimeout(state.viewportTimer);
  state.viewportTimer = 0;
  cancelAnimationFrame(state.viewportRaf);
  state.viewportRaf = requestAnimationFrame(() => {
    const scrollLeft = els.gestureLayer.scrollLeft;
    const scrollTop = els.gestureLayer.scrollTop;
    updateEditorMetrics();
    const size = getSheetViewportSize();
    const needsReload = force || viewportSizeChanged(size);
    if (!needsReload) {
      return;
    }
    state.lastViewportSize = size;
    els.scaleLayer.style.minWidth = `${size.width}px`;
    els.scaleLayer.style.minHeight = `${size.height}px`;
    // 编辑器、键盘或缩放变化后重新 resize 表格，再恢复宿主滚动位置，避免 canvas 可见跳动。
    resizeSpreadsheet(state.spreadsheet);
    els.gestureLayer.scrollLeft = scrollLeft;
    els.gestureLayer.scrollTop = scrollTop;
    scheduleSelectionHandleUpdate();
  });
}

function bindEvents() {
  ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'click'].forEach((eventName) => {
    els.cellEditor.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
    els.longPressMenu.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
  });

  document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.sheet-viewport')) event.preventDefault();
  });

  document.querySelector('#saveEdit').addEventListener('click', saveText);
  document.querySelector('#cancelEdit').addEventListener('click', cancelEdit);
  document.querySelector('#saveDate').addEventListener('click', saveDate);
  document.querySelector('#cancelDate').addEventListener('click', cancelEdit);
  document.querySelector('#focusEditor').addEventListener('click', () => {
    setEditorType(state.editorType, true);
    scheduleViewportUpdate(260);
  });
  document.querySelector('#zoomIn').addEventListener('click', () => setScale(state.scale + 0.1));
  document.querySelector('#zoomOut').addEventListener('click', () => setScale(state.scale - 0.1));
  document.querySelector('#resetZoom').addEventListener('click', () => setScale(1));
  document.querySelectorAll('[data-perf-rows]').forEach((button) => {
    button.addEventListener('click', () => {
      runSpreadsheetPerf(Number(button.dataset.perfRows), 50);
    });
  });

  document.querySelectorAll('[data-editor]').forEach((button) => {
    button.addEventListener('click', () => setEditorType(button.dataset.editor, true));
  });

  els.longPressMenu.querySelectorAll('[data-menu-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.menuAction;
      if (action === 'edit') setEditorType(state.editorType, true);
      if (action === 'copy') await copySelectedCell();
      if (action === 'clear') clearSelectedCell();
      if (action === 'text') setEditorType('text', true);
      if (action === 'date') setEditorType('date', true);
      if (action === 'zoom-in') setScale(state.scale + 0.1);
      if (action === 'zoom-out') setScale(state.scale - 0.1);
      hideLongPressMenu();
      scheduleViewportUpdate(120);
    });
  });

  els.cellInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && els.cellInput.dataset.composing !== 'true') {
      event.preventDefault();
      saveText();
    }
  });
  els.cellInput.addEventListener('focus', () => {
    hideLongPressMenu();
    document.documentElement.classList.add('keyboard-open');
    scheduleKeyboardSync();
  });
  els.cellInput.addEventListener('blur', () => {
    scheduleKeyboardSync();
    scheduleViewportUpdate(80, true);
  });
  els.cellInput.addEventListener('compositionstart', () => els.cellInput.dataset.composing = 'true');
  els.cellInput.addEventListener('compositionend', () => els.cellInput.dataset.composing = 'false');
  els.dateInput.addEventListener('focus', () => {
    hideLongPressMenu();
    document.documentElement.classList.add('keyboard-open');
    scheduleKeyboardSync();
  });
  els.dateInput.addEventListener('blur', () => {
    scheduleKeyboardSync();
    scheduleViewportUpdate(80, true);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncKeyboardOffset);
    window.visualViewport.addEventListener('scroll', syncKeyboardOffset);
  }
  window.addEventListener('resize', () => {
    syncKeyboardOffset();
    scheduleViewportUpdate();
    scheduleSelectionHandleUpdate();
  });

  const editorObserver = new ResizeObserver(() => scheduleViewportUpdate());
  editorObserver.observe(els.cellEditor);
}

bindEvents();
initSpreadsheet();
mountAdapter();
window.runSpreadsheetPerf = runSpreadsheetPerf;
setScale(1);
syncKeyboardOffset();
scheduleSelectionHandleUpdate();
