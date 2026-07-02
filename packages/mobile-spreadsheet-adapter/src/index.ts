export type {
  CellPoint,
  CellRange,
  CellRect,
  HostSelection,
  MobileSpreadsheetAdapter,
  MobileSpreadsheetAdapterOptions,
  PinchState,
  RangeSelectionResult,
  SelectRangeEndOptions,
} from './types.ts';

export { mountMobileSpreadsheetAdapter } from './gesture.ts';
export { resizeSpreadsheet } from './runtime.ts';
export {
  cellRectByClientPoint,
  getSelectedRange,
  selectRangeEndByClientPoint,
  selectedRangeClientRect,
  selectedRangeIncludes,
} from './selection.ts';
