export function renderAppShell(app: Element | null): void {
  if (!app) throw new Error('缺少 #app 容器。');
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
}

export function createDemoElements() {
  return {
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
}
