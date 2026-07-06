// @ts-nocheck
import Spreadsheet from './vendor/x-spreadsheet';
import {
  mountMobileSpreadsheetAdapter,
  resizeSpreadsheet,
  selectedRangeClientRect,
} from '../packages/mobile-spreadsheet-adapter/src/index.ts';
import { formatCellAddress, formatRangeAddress, normalizeDate } from './demo/cell-format.ts';
import { createBottomSheetExamples } from './demo/bottom-sheet-examples.ts';
import { getColumnEditorConfig } from './demo/column-editor-config.ts';
import { installPerfHooks, runSpreadsheetPerf as runPerfTest } from './demo/perf.ts';
import { buildSheetData, columns, rows } from './demo/sheet-data.ts';
import { createDemoElements, renderAppShell } from './demo/template.ts';
import './styles.css';

const app = document.querySelector('#app');
renderAppShell(app);
const els = createDemoElements();
let bottomSheetExamples = null;

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
  headerFilterRaf: 0,
  headerFilterSignature: '',
  keyboardSyncTimers: [],
  lastViewportSize: null,
  perfMetrics: null,
  filters: {},
  filterColumn: null,
};

/**
 * 暴露给页面按钮和调试台的性能测试入口。
 */
async function runSpreadsheetPerf(rowCount = 1000, colCount = 50) {
  return runPerfTest(state, els, showGestureTip, rowCount, colCount);
}

/**
 * 创建 x-spreadsheet 实例并绑定基础选区、编辑事件。
 */
function initSpreadsheet() {
  state.spreadsheet = new Spreadsheet('#xspreadsheet', {
    mode: 'edit',
    mobile: true,
    showToolbar: false,
    showContextmenu: false,
    showBottomBar: true,
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
  installPerfHooks(state);
  installHeaderFilterSync();
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
  renderHeaderFilters(true);
  scheduleViewportUpdate();
}

/**
 * 同步单格选中状态到移动端编辑器和快捷菜单。
 */
function updateSelection(cell, ri, ci) {
  const text = cell?.text ?? '';
  state.selected = { ri, ci, text, range: null };
  els.cellAddress.textContent = formatCellAddress(ri, ci);
  els.cellInput.value = text;
  els.dateInput.value = normalizeDate(text);

  setEditorType(getInputEditorType(ci, text), false);
  syncLongPressMenuContent();
  scheduleSelectionHandleUpdate();
}

/**
 * 同步多格选区状态，并更新选区地址展示。
 */
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

/**
 * 根据列宽、横向滚动和筛选状态生成筛选入口布局签名。
 */
function getHeaderFilterSignature() {
  const data = state.spreadsheet?.sheet?.data;
  if (!data?.cols) return '';
  const widths = columns.map((_, ci) => data.cols.getWidth?.(ci) || 100).join(',');
  const activeColumns = Object.entries(state.filters)
    .filter(([, selected]) => selected instanceof Set)
    .map(([ci]) => ci)
    .join(',');
  return [
    data.cols.indexWidth || 52,
    data.scroll?.x || 0,
    widths,
    activeColumns,
  ].join('|');
}

/**
 * 用 requestAnimationFrame 合并筛选入口位置刷新，避免列拖拽时频繁重绘 DOM。
 */
function scheduleHeaderFilterSync(force = false) {
  cancelAnimationFrame(state.headerFilterRaf);
  state.headerFilterRaf = requestAnimationFrame(() => renderHeaderFilters(force));
}

/**
 * 包裹基座运行时的列宽和横向滚动方法，让筛选入口跟随表头变化。
 */
function installHeaderFilterSync() {
  const data = state.spreadsheet?.sheet?.data;
  if (!data || data.__mobileHeaderFilterSyncInstalled) return;
  data.__mobileHeaderFilterSyncInstalled = true;

  if (data.cols && typeof data.cols.setWidth === 'function') {
    const originalSetWidth = data.cols.setWidth.bind(data.cols);
    data.cols.setWidth = (...args) => {
      const result = originalSetWidth(...args);
      scheduleHeaderFilterSync();
      return result;
    };
  }

  if (typeof data.scrollx === 'function') {
    const originalScrollx = data.scrollx.bind(data);
    data.scrollx = (...args) => {
      const before = data.scroll?.x || 0;
      const result = originalScrollx(...args);
      if ((data.scroll?.x || 0) !== before) scheduleHeaderFilterSync();
      return result;
    };
  }
}

/**
 * 渲染第一行标题上的筛选入口，不改 x-spreadsheet 基座。
 */
function renderHeaderFilters(force = false) {
  if (!els.headerFilterLayer || !state.spreadsheet?.sheet?.data) return;
  const data = state.spreadsheet.sheet.data;
  const signature = getHeaderFilterSignature();
  if (!force && signature === state.headerFilterSignature) return;
  state.headerFilterSignature = signature;

  const { cols } = data;
  const indexWidth = cols.indexWidth || 52;
  const scrollX = data.scroll?.x || 0;
  const viewportWidth = getSheetViewportSize().width;
  const buttonSize = 22;
  const buttonGap = 8;
  let left = indexWidth - scrollX;
  els.headerFilterLayer.innerHTML = columns.map((title, ci) => {
    const width = cols.getWidth?.(ci) || 100;
    const cellLeft = left;
    const cellRight = cellLeft + width;
    left += width;
    if (width < 44 || cellRight < indexWidth + 8 || cellLeft > viewportWidth - 8) return '';
    const active = state.filters[ci] instanceof Set;
    const buttonLeft = Math.min(cellRight - buttonSize - buttonGap, viewportWidth - buttonSize - 6);
    const style = `left:${Math.max(indexWidth + 4, buttonLeft)}px;width:${buttonSize}px;height:${buttonSize}px;`;
    return `
      <button class="header-filter-button${active ? ' active' : ''}" type="button" style="${style}" data-filter-ci="${ci}" aria-label="${title}筛选">
        <span aria-hidden="true"></span>
      </button>
    `;
  }).join('');

  els.headerFilterLayer.querySelectorAll('[data-filter-ci]').forEach((button) => {
    button.addEventListener('pointerdown', event => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openFilterPopover(Number(button.dataset.filterCi));
    });
  });
}

/**
 * 打开从顶部弹出的列筛选面板。
 */
function openFilterPopover(ci) {
  state.filterColumn = ci;
  setEditing(false);
  hideLongPressMenu();
  const values = getFilterValues(ci);
  const selected = state.filters[ci] || new Set(values);
  els.filterPopover.innerHTML = `
    <div class="filter-popover-panel">
      <header class="filter-popover-header">
        <button type="button" data-filter-action="cancel">取消</button>
        <strong>${columns[ci]}筛选</strong>
        <button type="button" data-filter-action="confirm">确定</button>
      </header>
      <div class="filter-popover-body">
        <button class="filter-option all${selected.size === values.length ? ' active' : ''}" type="button" data-filter-value="__all__">
          <span>全部</span><strong>✓</strong>
        </button>
        ${values.map(value => `
          <button class="filter-option${selected.has(value) ? ' active' : ''}" type="button" data-filter-value="${escapeAttribute(value)}">
            <span>${escapeHtml(value || '空白')}</span><strong>✓</strong>
          </button>
        `).join('')}
      </div>
      <footer class="filter-popover-footer">
        <button type="button" data-filter-action="clear">清除筛选</button>
      </footer>
    </div>
  `;
  els.filterPopover.classList.remove('hidden');
  requestAnimationFrame(() => els.filterPopover.classList.add('show'));
}

/**
 * 关闭顶部筛选面板。
 */
function closeFilterPopover() {
  els.filterPopover.classList.remove('show');
  window.setTimeout(() => els.filterPopover.classList.add('hidden'), 160);
  state.filterColumn = null;
}

/**
 * 获取某列可筛选值。
 */
function getFilterValues(ci) {
  return [...new Set(rows.map(row => String(row[ci] ?? '')))];
}

/**
 * 从筛选弹窗 DOM 中读取当前勾选值。
 */
function readFilterSelection() {
  const activeValues = [...els.filterPopover.querySelectorAll('.filter-option.active[data-filter-value]')]
    .map(item => item.dataset.filterValue)
    .filter(value => value && value !== '__all__');
  return new Set(activeValues);
}

/**
 * 转义插入 HTML 文本节点的值，避免业务数据破坏筛选弹窗结构。
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * 转义插入 HTML 属性的值。
 */
function escapeAttribute(value) {
  return escapeHtml(value);
}

/**
 * 根据当前勾选状态刷新“全部”按钮。
 */
function syncAllFilterOption() {
  const allButton = els.filterPopover.querySelector('[data-filter-value="__all__"]');
  const valueButtons = [...els.filterPopover.querySelectorAll('.filter-option:not(.all)[data-filter-value]')];
  if (!allButton) return;
  allButton.classList.toggle('active', valueButtons.length > 0 && valueButtons.every(button => button.classList.contains('active')));
}

/**
 * 处理顶部筛选弹窗内的按钮点击。
 */
function handleFilterPopoverClick(event) {
  const button = event.target.closest('button');
  if (!button || !els.filterPopover.contains(button)) return;

  const action = button.dataset.filterAction;
  if (action === 'cancel') {
    closeFilterPopover();
    return;
  }

  if (action === 'clear') {
    delete state.filters[state.filterColumn];
    applyFilters();
    closeFilterPopover();
    return;
  }

  if (action === 'confirm') {
    const selected = readFilterSelection();
    const values = getFilterValues(state.filterColumn);
    if (selected.size === values.length) {
      delete state.filters[state.filterColumn];
    } else {
      state.filters[state.filterColumn] = selected;
    }
    applyFilters();
    closeFilterPopover();
    return;
  }

  const value = button.dataset.filterValue;
  if (!value) return;

  if (value === '__all__') {
    const shouldSelectAll = !button.classList.contains('active');
    els.filterPopover.querySelectorAll('.filter-option[data-filter-value]').forEach((item) => {
      item.classList.toggle('active', shouldSelectAll);
    });
    return;
  }

  button.classList.toggle('active');
  syncAllFilterOption();
}

/**
 * 应用当前筛选条件并重建 demo 表格数据。
 */
function applyFilters() {
  const filteredRows = rows.filter(row => Object.entries(state.filters).every(([ci, selected]) => {
    if (!selected) return true;
    if (selected.size === 0) return false;
    return selected.has(String(row[Number(ci)] ?? ''));
  }));
  state.spreadsheet.loadData(buildSheetData(filteredRows));
  installHeaderFilterSync();
  state.spreadsheet.sheet?.selector?.set?.(1, 0);
  state.spreadsheet.sheet?.table?.render?.();
  updateSelection({ text: filteredRows[0]?.[0] || '' }, 1, 0);
  renderHeaderFilters(true);
  scheduleViewportUpdate(0, true);
}

/**
 * 聚焦移动端输入控件，并把光标移动到文本末尾。
 */
function focusEditorControl(control) {
  if (!control) return;
  control.focus({ preventScroll: true });
  if (control === els.cellInput) {
    const end = control.value.length;
    control.setSelectionRange(end, end);
  }
}

/**
 * 切换底部编辑器显示状态，并触发表格视口重算。
 */
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

/**
 * 切换文本、数字、日期编辑模式，必要时主动唤起输入控件。
 */
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

/**
 * 保存普通文本输入框中的值。
 */
function saveText() {
  const value = els.cellInput.value;
  commitValue(value);
}

/**
 * 保存日期输入框中的值。
 */
function saveDate() {
  commitValue(els.dateInput.value);
}

/**
 * 将编辑值写回 x-spreadsheet，并关闭移动端编辑器。
 */
function commitValue(value) {
  const { ri, ci } = state.selected;
  state.spreadsheet.cellText(ri, ci, value).reRender();
  updateSelection({ text: value }, ri, ci);
  setEditing(false);
  hideLongPressMenu();
  scheduleViewportUpdate();
}

/**
 * 统一移除文本和日期输入框焦点。
 */
function blurEditors() {
  els.cellInput.blur();
  els.dateInput.blur();
}

/**
 * 放弃当前编辑内容，恢复选中单元格原值。
 */
function cancelEdit() {
  els.cellInput.value = state.selected.text;
  els.dateInput.value = normalizeDate(state.selected.text);
  setEditing(false);
}

/**
 * 根据列配置和当前文本推导底部输入框类型，未配置时默认文本。
 */
function getInputEditorType(ci, text) {
  const config = getColumnEditorConfig(ci);
  if (config.editor === 'date') return 'date';
  if (config.editor === 'number') return 'number';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return 'date';
  return 'text';
}

/**
 * 点击单元格后按列配置打开编辑器；未配置的列默认打开文本输入框。
 */
function openEditorBySelectedColumn() {
  if (state.selected.range) return;
  if (state.selected.ri === 0) {
    setEditing(false);
    return;
  }
  const config = getColumnEditorConfig(state.selected.ci);
  if (config.editor === 'bottom-sheet' && config.sheetKey) {
    setEditing(false);
    bottomSheetExamples?.open(config.sheetKey, {
      currentValue: state.selected.text,
      column: config,
      selected: state.selected,
    });
    return;
  }
  enterEditMode(getInputEditorType(state.selected.ci, state.selected.text));
}

/**
 * 进入双击编辑模式，并启动键盘视口同步。
 */
function enterEditMode(type = state.editorType) {
  hideLongPressMenu();
  setEditing(true);
  setEditorType(type, true);
  // 移动端 WebView 往往会分阶段上报键盘视口变化。这里短时间多次同步，让底部编辑器和表格 canvas 一起稳定下来。
  scheduleKeyboardSync();
  scheduleViewportUpdate(180, true);
}

/**
 * 复制当前选区文本；剪贴板不可用时降级为选中文本。
 */
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

/**
 * 清空当前选中单元格内容。
 */
function clearSelectedCell() {
  commitValue('');
  showGestureTip('已清空当前单元格');
}

/**
 * 设置宿主缩放比例，并同步表格逻辑尺寸和选区手柄位置。
 */
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

/**
 * 处理 adapter 判定后的单击：关闭菜单并退出编辑态。
 */
function handleAdapterSingleTap(event) {
  if (event.target.closest('.long-press-menu')) return;
  hideLongPressMenu();
  if (event.pointerType !== 'mouse' || event.button === 0) {
    openEditorBySelectedColumn();
  }
}

/**
 * 处理 adapter 判定后的双击：按列配置打开对应编辑器。
 */
function handleAdapterDoubleTap() {
  openEditorBySelectedColumn();
}

/**
 * 处理 adapter 判定后的长按：在触点附近展示快捷菜单。
 */
function handleAdapterLongPress(event) {
  showLongPressMenu(event.clientX, event.clientY);
}

/**
 * 处理选区拖拽开始：关闭浮层并进入手柄拖拽样式。
 */
function handleAdapterRangeDragStart() {
  hideLongPressMenu();
  setEditing(false);
  els.selectionHandles.classList.add('dragging');
}

/**
 * 处理选区拖拽结束：恢复手柄样式并刷新手柄位置。
 */
function handleAdapterRangeDragEnd() {
  hideLongPressMenu();
  els.selectionHandles.classList.remove('dragging');
  scheduleSelectionHandleUpdate();
}

/**
 * 处理双指捏合开始：记录基础缩放比例。
 */
function handleAdapterPinchStart(pinch) {
  state.baseScale = state.scale;
  state.isPinching = true;
  els.gestureLayer.classList.add('pinching');
  els.gestureTip.classList.add('show');
  pinch.baseScale = state.baseScale;
}

/**
 * 处理双指捏合移动：按距离变化实时更新缩放。
 */
function handleAdapterPinchMove(pinch) {
  setScale((pinch.baseScale || state.baseScale) * pinch.scaleDelta, {
    immediate: false,
    updateViewport: false,
  });
  scheduleSelectionHandleUpdate();
}

/**
 * 处理双指捏合结束：重算表格视口并收起提示。
 */
function handleAdapterPinchEnd() {
  if (state.isPinching) scheduleViewportUpdate();
  state.isPinching = false;
  els.gestureLayer.classList.remove('pinching');
  setTimeout(() => els.gestureTip.classList.remove('show'), 700);
}

/**
 * 根据当前选区刷新长按菜单标题和内容摘要。
 */
function syncLongPressMenuContent() {
  if (!els.menuCellAddress || !els.menuCellText) return;
  els.menuCellAddress.textContent = state.selected.range
    ? formatRangeAddress(state.selected.range)
    : formatCellAddress(state.selected.ri, state.selected.ci);
  els.menuCellText.textContent = state.selected.text || '空单元格';
}

/**
 * 在移动端视口内计算长按菜单位置，避免被编辑器遮挡。
 */
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

/**
 * 隐藏长按快捷菜单。
 */
function hideLongPressMenu() {
  els.longPressMenu.classList.remove('show');
  els.longPressMenu.classList.add('hidden');
}

/**
 * 设置单个选区手柄的屏幕位置。
 */
function setHandlePosition(handle, x, y) {
  handle.style.left = `${Math.round(x)}px`;
  handle.style.top = `${Math.round(y)}px`;
}

/**
 * 根据 x-spreadsheet 当前选区 DOM 矩形刷新移动端触摸手柄。
 */
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

/**
 * 使用 requestAnimationFrame 合并多次手柄刷新请求。
 */
function scheduleSelectionHandleUpdate(delay = 0) {
  if (!els.selectionHandles) return;
  cancelAnimationFrame(state.handleRaf);
  if (delay > 0) {
    window.setTimeout(scheduleSelectionHandleUpdate, delay);
    return;
  }
  state.handleRaf = requestAnimationFrame(updateSelectionHandles);
}

/**
 * 挂载移动端适配包，并把手势回调桥接到 demo UI。
 */
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

/**
 * 展示短暂手势提示文案。
 */
function showGestureTip(message) {
  els.gestureTip.textContent = message;
  els.gestureTip.classList.add('show');
  window.setTimeout(() => {
    els.gestureTip.classList.remove('show');
    els.gestureTip.textContent = '双指捏合可缩放，单指拖动可浏览表格';
  }, 1200);
}

/**
 * 根据 visualViewport 同步软键盘遮挡高度，解决 iOS/Android 键盘弹起后的空白和错位。
 */
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

/**
 * 分阶段同步键盘尺寸，兼容 WebView 多次上报 visualViewport 的情况。
 */
function scheduleKeyboardSync() {
  state.keyboardSyncTimers.forEach(timer => window.clearTimeout(timer));
  state.keyboardSyncTimers = [0, 80, 180, 320].map(delay => window.setTimeout(() => {
    syncKeyboardOffset();
    scheduleViewportUpdate(0, true);
  }, delay));
}

/**
 * 获取当前可见应用高度，移动端优先使用 visualViewport。
 */
function getVisibleAppHeight() {
  const vv = window.visualViewport;
  if (vv && window.matchMedia('(max-width: 739px)').matches) {
    return Math.min(vv.height, els.appShell.clientHeight || vv.height);
  }
  return els.appShell.clientHeight || window.innerHeight;
}

/**
 * 计算 x-spreadsheet 内部逻辑视口尺寸，缩放时使用反向尺寸保证坐标对齐。
 */
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

/**
 * 同步底部编辑器高度到 CSS 变量和表格滚动容器。
 */
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

/**
 * 判断本次计算出的表格视口尺寸是否发生变化。
 */
function viewportSizeChanged(size) {
  const last = state.lastViewportSize;
  return !last || last.width !== size.width || last.height !== size.height;
}

/**
 * 合并表格 resize 请求，保留滚动位置并刷新选区手柄。
 */
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
    renderHeaderFilters();
    scheduleSelectionHandleUpdate();
  });
}

/**
 * 绑定 demo 页面所有按钮、输入框、键盘和视口事件。
 */
function bindEvents() {
  ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'click'].forEach((eventName) => {
    els.cellEditor.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
    els.longPressMenu.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
    els.filterPopover.addEventListener(eventName, (event) => {
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
      if (bottomSheetExamples?.open(action, { currentValue: state.selected.text })) {
        hideLongPressMenu();
        scheduleViewportUpdate(120);
        return;
      }
      if (action === 'zoom-in') setScale(state.scale + 0.1);
      if (action === 'zoom-out') setScale(state.scale - 0.1);
      hideLongPressMenu();
      scheduleViewportUpdate(120);
    });
  });

  els.filterPopover.addEventListener('click', handleFilterPopoverClick);

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
bottomSheetExamples = createBottomSheetExamples({ commitValue, showGestureTip, mount: els.appShell });
window.runSpreadsheetPerf = runSpreadsheetPerf;
window.mobileBottomSheets = bottomSheetExamples;
setScale(1);
syncKeyboardOffset();
scheduleSelectionHandleUpdate();
