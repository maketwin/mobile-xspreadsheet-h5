// @ts-nocheck
import { buildLargeSheetData } from './sheet-data.ts';

/**
 * 重置表格渲染耗时统计。
 */
export function resetPerfMetrics(state) {
  state.perfMetrics = {
    renderCount: 0,
    renderTotal: 0,
    renderMax: 0,
  };
}

/**
 * 包装 x-spreadsheet table.render，统计每次重绘耗时。
 */
export function installPerfHooks(state) {
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

/**
 * 等待两个 requestAnimationFrame，确保浏览器完成一轮布局和绘制。
 */
function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/**
 * 将毫秒数格式化为固定一位小数的展示文本。
 */
function formatMs(value) {
  return `${value.toFixed(1)}ms`;
}

/**
 * 更新页面上的性能测试结果面板。
 */
function updatePerfPanel(els, result, running = false) {
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

/**
 * 执行完整性能测试：生成数据、加载数据、模拟滚动并汇总渲染指标。
 */
export async function runSpreadsheetPerf(state, els, showGestureTip, rowCount = 1000, colCount = 50) {
  installPerfHooks(state);
  const result = { rows: rowCount, cols: colCount };
  updatePerfPanel(els, result, true);
  await nextFrame();

  resetPerfMetrics(state);
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
  updatePerfPanel(els, result);
  showGestureTip(`性能测试完成：${rowCount} x ${colCount}`);
  window.__lastSpreadsheetPerf = result;
  return result;
}
