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
