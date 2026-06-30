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

## API

### `mountMobileSpreadsheetAdapter(options)`

Mounts mobile pointer handling on a host element and returns a controller with
`destroy()`.

Required options:

- `spreadsheet`: x-spreadsheet instance.
- `target`: DOM element that receives pointer events, usually the sheet
  viewport or a transparent gesture layer.

Main callbacks:

- `onSingleTap(event)`: select-only behavior, often used to hide the editor.
- `onDoubleTap(event)`: enter edit mode.
- `onLongPress(event)`: show a cell or range action menu.
- `onRangeDragStart(result, event)`: range drag has crossed the movement
  threshold.
- `onRangeDragMove(result, event)`: range changed during dragging.
- `onRangeDragEnd(result, event)`: range drag finished.
- `onPinchStart(pinch, event)`, `onPinchMove(pinch, event)`,
  `onPinchEnd(pinch, event)`: host-owned zoom behavior.

Gesture thresholds:

- `longPressMs`: defaults to `550`.
- `tapMoveTolerance`: defaults to `10`.
- `dragStartTolerance`: defaults to `14`.
- `doubleTapMs`: defaults to `320`.
- `doubleTapTolerance`: defaults to `24`.
- `edgeScroll`: defaults to `true`.
- `edgeSize`: defaults to `42`.
- `edgeMaxSpeed`: defaults to `18`.

### Coordinate and Selection Helpers

- `cellRectByClientPoint(spreadsheet, clientX, clientY)`: converts viewport
  coordinates to a spreadsheet cell rect, respecting host CSS scale.
- `selectedRangeIncludes(spreadsheet, ri, ci)`: checks whether a cell is inside
  the selected range.
- `getSelectedRange(spreadsheet)`: reads the current runtime range.
- `selectedRangeClientRect(spreadsheet)`: reads the selected range DOM rect for
  positioning custom handles.
- `selectRangeEndByClientPoint(spreadsheet, clientX, clientY, options)`: extends
  selection to the cell under a viewport point.
- `resizeSpreadsheet(spreadsheet)`: calls the available resize/reload/render
  lifecycle method on the spreadsheet instance.

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

## Gesture Priority

The adapter uses this order:

1. Two active pointers become pinch zoom.
2. Dragging a marked selection handle resizes the current range.
3. Dragging inside the selected cell/range extends the range.
4. A stable tap becomes single tap or double tap.
5. A stable press longer than `longPressMs` becomes long press.

This priority avoids the common mobile conflict where single-finger scroll,
range resize, double tap editing, and long-press menu all compete for the same
touch stream.
