# @mobile-excel/x-spreadsheet-adapter

Non-invasive mobile adapter for an x-spreadsheet-like instance.

The package is intentionally kept outside the spreadsheet engine source. It
uses the instance object and DOM that the engine already exposes at runtime,
so mobile behavior can evolve without patching the Excel base.

## Responsibilities

- Convert browser client coordinates to spreadsheet cell coordinates.
- Extend the current selected range during mobile drag selection.
- Own the mobile pointer state machine through `mountMobileSpreadsheetAdapter`.
- Support draggable mobile selection handles through
  `data-mobile-selection-handle="start|end"`.
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

## Selection Handles

The adapter does not render handles by itself. The host app can place any UI
over the selected range and mark the handles with:

```html
<button data-mobile-selection-handle="start"></button>
<button data-mobile-selection-handle="end"></button>
```

Dragging the start handle keeps the range end as the anchor. Dragging the end
handle keeps the range start as the anchor. This keeps selection resizing in
the adapter package while the host app owns the visual style.
