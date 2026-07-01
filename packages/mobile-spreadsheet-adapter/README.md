# @mobile-excel/x-spreadsheet-adapter

面向 x-spreadsheet 类实例的非侵入式移动端适配包。

这个包刻意放在表格引擎源码之外。它只使用引擎运行时已经暴露的实例对象和 DOM，因此移动端能力可以持续演进，而不需要 patch Excel 基座。

## 职责

- 将浏览器客户端坐标转换为表格单元格坐标。
- 在移动端拖拽选择时扩展当前选区。
- 通过 `mountMobileSpreadsheetAdapter` 维护移动端 pointer 状态机。
- 支持带有 `data-mobile-selection-handle="start|end"` 标记的选区手柄拖拽。
- 支持拖拽选区靠近视口边缘时自动滚动。
- 触发表格已有的选区事件和渲染路径。
- 提供小而可组合的 helper，由宿主应用接入自己的编辑器、键盘、长按菜单和捏合缩放 UI。

## 非目标

- 不 fork 或修改 `src/vendor/x-spreadsheet`。
- 不假设固定的编辑器 UI。
- 不接管业务数据或持久化。

## 基础用法

```js
import {
  mountMobileSpreadsheetAdapter,
} from '../packages/mobile-spreadsheet-adapter/src/index.ts';

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

在宿主元素上挂载移动端 pointer 处理逻辑，并返回带有 `destroy()` 的控制器。

必填参数：

- `spreadsheet`：x-spreadsheet 实例。
- `target`：接收 pointer 事件的 DOM 元素，通常是表格视口或透明手势层。

主要回调：

- `onSingleTap(event)`：确认单击后触发，常用于只选中并隐藏编辑器。
- `onDoubleTap(event)`：确认双击后触发，常用于进入编辑态。
- `onLongPress(event)`：长按阈值达成后触发，常用于展示单元格或选区操作菜单。
- `onRangeDragStart(result, event)`：拖拽距离超过阈值、正式进入选区拖拽时触发。
- `onRangeDragMove(result, event)`：拖拽过程中选区变化时触发。
- `onRangeDragEnd(result, event)`：选区拖拽结束时触发。
- `onPinchStart(pinch, event)`、`onPinchMove(pinch, event)`、`onPinchEnd(pinch, event)`：宿主自定义缩放行为。

手势阈值：

- `longPressMs`：默认 `550`。
- `tapMoveTolerance`：默认 `10`。
- `dragStartTolerance`：默认 `14`。
- `doubleTapMs`：默认 `320`。
- `doubleTapTolerance`：默认 `24`。
- `edgeScroll`：默认 `true`。
- `edgeSize`：默认 `42`。
- `edgeMaxSpeed`：默认 `18`。

### 坐标和选区 helper

- `cellRectByClientPoint(spreadsheet, clientX, clientY)`：将视口坐标转换为表格单元格 rect，并兼容宿主 CSS 缩放。
- `selectedRangeIncludes(spreadsheet, ri, ci)`：判断单元格是否在当前选区内。
- `getSelectedRange(spreadsheet)`：读取当前运行时选区。
- `selectedRangeClientRect(spreadsheet)`：读取当前选区 DOM rect，用于定位宿主自定义手柄。
- `selectRangeEndByClientPoint(spreadsheet, clientX, clientY, options)`：将选区扩展到视口坐标下的单元格。
- `resizeSpreadsheet(spreadsheet)`：调用 spreadsheet 实例上可用的 resize、reload 或 render 生命周期方法。

## 选区手柄

适配包不直接渲染手柄。宿主应用可以在选区上方放置任意 UI，并用以下属性标记：

```html
<button data-mobile-selection-handle="start"></button>
<button data-mobile-selection-handle="end"></button>
```

拖拽起点手柄时，适配包会把选区终点作为固定锚点。拖拽终点手柄时，适配包会把选区起点作为固定锚点。这样选区调整能力留在适配包里，视觉样式仍由宿主应用控制。

## 手势优先级

适配包按以下顺序处理手势：

1. 两个活跃 pointer 进入双指捏合。
2. 拖拽带标记的选区手柄时调整当前选区。
3. 在已选单元格或选区内拖拽时扩展选区。
4. 稳定点击识别为单击或双击。
5. 稳定按压超过 `longPressMs` 后识别为长按。

这个优先级用于避免移动端常见冲突：单指滚动、选区调整、双击编辑和长按菜单都在争抢同一段触摸流。
