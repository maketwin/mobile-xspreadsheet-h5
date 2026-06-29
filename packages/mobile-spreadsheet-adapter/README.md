# @mobile-excel/x-spreadsheet-adapter

Non-invasive mobile adapter for an x-spreadsheet-like instance.

The package is intentionally kept outside the spreadsheet engine source. It
uses the instance object and DOM that the engine already exposes at runtime,
so mobile behavior can evolve without patching the Excel base.

## Responsibilities

- Convert browser client coordinates to spreadsheet cell coordinates.
- Extend the current selected range during mobile drag selection.
- Own the mobile pointer state machine through `mountMobileSpreadsheetAdapter`.
- Support edge auto-scroll while dragging a range near the viewport boundary.
- Trigger the spreadsheet's existing selection event and render path.
- Provide small, composable helpers that the host app can wire into its own
  editor, keyboard, long-press menu, and pinch-zoom UI.

## Non-goals

- Do not fork or modify `src/vendor/x-spreadsheet`.
- Do not assume one fixed editor UI.
- Do not own application data or persistence.

## Basic Usage

```js
import {
  mountMobileSpreadsheetAdapter,
} from '../packages/mobile-spreadsheet-adapter/src/index.js';

const adapter = mountMobileSpreadsheetAdapter({
  spreadsheet,
  target: document.querySelector('#gestureLayer'),
  getSelected: () => selectedCellState,
  onSingleTap: () => hideEditor(),
  onDoubleTap: () => showEditor(),
  onLongPress: event => showMenu(event.clientX, event.clientY),
  onPinchMove: pinch => setScale(baseScale * pinch.scaleDelta),
});

adapter.destroy();
```
