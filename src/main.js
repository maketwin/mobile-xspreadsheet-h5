import Spreadsheet from 'x-data-spreadsheet';
import 'x-data-spreadsheet/dist/xspreadsheet.css';
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
    </main>

    <section class="cell-editor" id="cellEditor" aria-label="移动端单元格编辑器">
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
  selected: { ri: 0, ci: 0, text: '' },
  editorType: 'text',
  scale: 1,
  baseScale: 1,
  pinchStartDistance: 0,
  pointerCache: new Map(),
  keyboardOffset: 0,
  editorHeight: 132,
  viewportRaf: 0,
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
  columns.forEach((text, ci) => {
    cells[ci] = { text, style: 1 };
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

function initSpreadsheet() {
  state.spreadsheet = new Spreadsheet('#xspreadsheet', {
    mode: 'edit',
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
  state.spreadsheet.on('cell-selected', (cell, ri, ci) => {
    updateSelection(cell, ri, ci);
  });
  state.spreadsheet.on('cell-edited', (text, ri, ci) => {
    updateSelection({ text }, ri, ci);
  });

  updateSelection({ text: rows[0][2] }, 1, 2);
  scheduleViewportUpdate();
}

function updateSelection(cell, ri, ci) {
  const text = cell?.text ?? '';
  state.selected = { ri, ci, text };
  els.cellAddress.textContent = `${toColumnName(ci)}${ri + 1}`;
  els.cellInput.value = text;
  els.dateInput.value = normalizeDate(text);

  if (ci === 5 || /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    setEditorType('date', false);
  } else if (ci === 1) {
    setEditorType('number', false);
  } else {
    setEditorType('text', false);
  }
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

function setEditorType(type, focus = true) {
  state.editorType = type;
  document.documentElement.dataset.editorType = type;
  els.cellType.textContent = type === 'date' ? '日期' : type === 'number' ? '数字' : '文本';
  els.textEditor.classList.toggle('hidden', type === 'date');
  els.dateEditor.classList.toggle('hidden', type !== 'date');
  els.cellInput.inputMode = type === 'number' ? 'decimal' : 'text';
  if (focus) {
    requestAnimationFrame(() => {
      if (type === 'date') els.dateInput.focus();
      else els.cellInput.focus();
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
  blurEditors();
}

function blurEditors() {
  els.cellInput.blur();
  els.dateInput.blur();
}

function cancelEdit() {
  els.cellInput.value = state.selected.text;
  els.dateInput.value = normalizeDate(state.selected.text);
  blurEditors();
}

function setScale(nextScale) {
  state.scale = Math.min(1.7, Math.max(0.72, nextScale));
  els.scaleLayer.style.transform = `scale(${state.scale})`;
  els.scaleLayer.style.width = `${100 / state.scale}%`;
  els.scaleLayer.style.height = `${100 / state.scale}%`;
  els.zoomText.textContent = `${Math.round(state.scale * 100)}%`;
  scheduleViewportUpdate();
}

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function onPointerDown(event) {
  state.pointerCache.set(event.pointerId, event);
  if (state.pointerCache.size === 2) {
    const points = [...state.pointerCache.values()];
    state.pinchStartDistance = distance(points[0], points[1]);
    state.baseScale = state.scale;
    els.gestureLayer.classList.add('pinching');
    els.gestureTip.classList.add('show');
  }
}

function onPointerMove(event) {
  if (!state.pointerCache.has(event.pointerId)) return;
  state.pointerCache.set(event.pointerId, event);
  if (state.pointerCache.size !== 2) return;

  event.preventDefault();
  const points = [...state.pointerCache.values()];
  const nextDistance = distance(points[0], points[1]);
  if (!state.pinchStartDistance) return;
  setScale(state.baseScale * (nextDistance / state.pinchStartDistance));
}

function onPointerUp(event) {
  state.pointerCache.delete(event.pointerId);
  if (state.pointerCache.size < 2) {
    els.gestureLayer.classList.remove('pinching');
    setTimeout(() => els.gestureTip.classList.remove('show'), 700);
  }
}

function syncKeyboardOffset() {
  const vv = window.visualViewport;
  const offset = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  state.keyboardOffset = offset;
  document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);
  document.documentElement.classList.toggle('keyboard-open', offset > 80);
  scheduleViewportUpdate();
}

function getVisibleAppHeight() {
  const vv = window.visualViewport;
  if (vv && window.matchMedia('(max-width: 739px)').matches) {
    return vv.height;
  }
  return els.appShell.clientHeight || window.innerHeight;
}

function getSheetViewportSize() {
  const topbarHeight = els.topbar.getBoundingClientRect().height || 64;
  const editorHeight = state.editorHeight || els.cellEditor.getBoundingClientRect().height || 132;
  const appWidth = els.appShell.clientWidth || window.innerWidth;
  const visibleHeight = getVisibleAppHeight();
  const availableHeight = visibleHeight - topbarHeight - editorHeight - 6;

  return {
    width: Math.max(320, Math.floor(appWidth / state.scale)),
    height: Math.max(220, Math.floor(availableHeight / state.scale)),
  };
}

function updateEditorMetrics() {
  const rect = els.cellEditor.getBoundingClientRect();
  state.editorHeight = Math.ceil(rect.height);
  document.documentElement.style.setProperty('--editor-height', `${state.editorHeight}px`);
  els.gestureLayer.style.paddingBottom = `${state.editorHeight + 10}px`;
}

function scheduleViewportUpdate() {
  cancelAnimationFrame(state.viewportRaf);
  state.viewportRaf = requestAnimationFrame(() => {
    updateEditorMetrics();
    const size = getSheetViewportSize();
    els.scaleLayer.style.minWidth = `${size.width}px`;
    els.scaleLayer.style.minHeight = `${size.height}px`;
    state.spreadsheet?.reRender();
  });
}

function bindEvents() {
  ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'click'].forEach((eventName) => {
    els.cellEditor.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
  });

  document.querySelector('#saveEdit').addEventListener('click', saveText);
  document.querySelector('#cancelEdit').addEventListener('click', cancelEdit);
  document.querySelector('#saveDate').addEventListener('click', saveDate);
  document.querySelector('#cancelDate').addEventListener('click', cancelEdit);
  document.querySelector('#focusEditor').addEventListener('click', () => setEditorType(state.editorType, true));
  document.querySelector('#zoomIn').addEventListener('click', () => setScale(state.scale + 0.1));
  document.querySelector('#zoomOut').addEventListener('click', () => setScale(state.scale - 0.1));
  document.querySelector('#resetZoom').addEventListener('click', () => setScale(1));

  document.querySelectorAll('[data-editor]').forEach((button) => {
    button.addEventListener('click', () => setEditorType(button.dataset.editor, true));
  });

  els.cellInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && els.cellInput.dataset.composing !== 'true') {
      event.preventDefault();
      saveText();
    }
  });
  els.cellInput.addEventListener('compositionstart', () => els.cellInput.dataset.composing = 'true');
  els.cellInput.addEventListener('compositionend', () => els.cellInput.dataset.composing = 'false');

  els.gestureLayer.addEventListener('pointerdown', onPointerDown, { passive: true });
  els.gestureLayer.addEventListener('pointermove', onPointerMove, { passive: false });
  els.gestureLayer.addEventListener('pointerup', onPointerUp, { passive: true });
  els.gestureLayer.addEventListener('pointercancel', onPointerUp, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncKeyboardOffset);
    window.visualViewport.addEventListener('scroll', syncKeyboardOffset);
  }
  window.addEventListener('resize', () => {
    syncKeyboardOffset();
    scheduleViewportUpdate();
  });

  const editorObserver = new ResizeObserver(() => scheduleViewportUpdate());
  editorObserver.observe(els.cellEditor);
}

bindEvents();
initSpreadsheet();
setScale(1);
syncKeyboardOffset();
