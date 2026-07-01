# H5 Excel 移动端适配完整中文文档

## 1. 文档目的

本文档整理 `mobile-xspreadsheet-h5` 从 H5 Excel demo 到移动端适配包的完整方案，覆盖背景、架构边界、交互规则、适配包 API、demo 接入方式、测试验证和后续迭代建议。

当前结论：

- Excel 基座不再继续修改。
- 移动端能力沉淀为独立适配包。
- demo 只作为适配包接入示例和验证环境。
- 新增能力优先放在 `packages/mobile-spreadsheet-adapter`，必要时由业务宿主自行实现 UI。

## 2. 项目信息

- 本地路径：`/Users/sunxin/work/mobile-xspreadsheet-h5`
- 远端仓库：`https://github.com/maketwin/mobile-xspreadsheet-h5`
- GitHub Pages：`https://maketwin.github.io/mobile-xspreadsheet-h5/`
- 当前功能分支：`codex/optimize-mobile-spreadsheet-performance`
- Excel 基座源码：`src/vendor/x-spreadsheet`
- 移动端适配包：`packages/mobile-spreadsheet-adapter`

## 3. 当前能力总览

已支持能力：

- 类 Excel 的 canvas 表格渲染。
- 移动端单击选中。
- 移动端双击进入编辑。
- 移动端长按快捷菜单。
- 移动端拖拽扩大选区。
- 移动端选区起点和终点手柄拖拽。
- 双指捏合缩放。
- 键盘弹起时自动调整表格高度。
- iOS / Android 软键盘视口兼容。
- 底部编辑栏仅在编辑态展示。
- 文本、数字、日期编辑。
- 复制、清空、类型切换、缩放快捷操作。
- 大数据量渲染性能测试入口。
- GitHub Pages 预览。
- 适配包 README、JSDoc 和 TypeScript 类型定义。
- 适配包单元测试。

## 4. 架构原则

### 4.1 不再修改 Excel 基座

`src/vendor/x-spreadsheet` 视为当前既有基座。后续移动端能力不再通过修改这个目录实现。

原因：

- 降低升级 x-spreadsheet 的成本。
- 避免业务移动端能力和表格内核强绑定。
- 让移动端手势、键盘、编辑器、菜单可以独立演进。
- 方便未来将适配包接入其他 x-spreadsheet 类实例。

### 4.2 适配包负责行为，宿主负责 UI

适配包负责：

- pointer 状态机。
- 单击、双击、长按、拖拽、捏合等手势识别。
- 浏览器坐标和表格坐标转换。
- 选区扩展。
- 选区手柄锚点处理。
- 边缘自动滚动。
- resize / reload / render 桥接。

宿主负责：

- 底部编辑器 UI。
- 输入框和日期选择器。
- 长按菜单 UI。
- 选区手柄视觉样式。
- 缩放 UI 和缩放比例状态。
- 数据保存。
- 权限、埋点、业务校验。

## 5. 目录结构

```text
mobile-xspreadsheet-h5
├── README.md
├── docs
│   ├── change-summary.md
│   └── mobile-excel-adapter-full-guide.md
├── packages
│   └── mobile-spreadsheet-adapter
│       ├── README.md
│       ├── package.json
│       └── src
│           ├── index.ts
│           └── index.test.ts
├── src
│   ├── main.ts
│   ├── styles.css
│   └── vendor
│       └── x-spreadsheet
├── package.json
└── package-lock.json
```

## 6. 移动端交互规则

当前交互定义：

- 单击单元格：只选中，不弹键盘，不展示底部编辑栏。
- 双击单元格：进入编辑态，展示底部编辑栏并聚焦输入框。
- 长按单元格：展示快捷菜单。
- 在当前选中单元格或选区内拖动：扩展选区范围。
- 拖动选区起点手柄：固定选区终点，调整选区起点。
- 拖动选区终点手柄：固定选区起点，调整选区终点。
- 双指捏合：缩放表格。
- 编辑态点击取消或保存：收起编辑栏并恢复表格高度。

手势优先级：

1. 两个活跃 pointer 进入双指捏合。
2. 拖拽带标记的选区手柄时调整当前选区。
3. 在已选单元格或选区内拖拽时扩展选区。
4. 稳定点击识别为单击或双击。
5. 稳定按压超过 `longPressMs` 后识别为长按。

这个顺序用于解决移动端常见冲突：单指滚动、拖拽框选、双击编辑、长按菜单都可能来自同一段触摸流。

## 7. 适配包说明

适配包位置：

```text
packages/mobile-spreadsheet-adapter
```

包名：

```text
@mobile-excel/x-spreadsheet-adapter
```

入口：

```js
import {
  mountMobileSpreadsheetAdapter,
  resizeSpreadsheet,
  selectedRangeClientRect,
} from '../packages/mobile-spreadsheet-adapter/src/index.ts';
```

发布清单：

- `README.md`
- `package.json`
- `src/index.ts`

测试文件 `src/index.test.ts` 不进入发布包。

## 8. 适配包 API

### 8.1 `mountMobileSpreadsheetAdapter(options)`

在宿主元素上挂载移动端手势适配器。

基础示例：

```js
const adapter = mountMobileSpreadsheetAdapter({
  spreadsheet,
  target: document.querySelector('#gestureLayer'),
  getSelected: () => selected,
  onSingleTap: () => hideEditor(),
  onDoubleTap: () => showEditor(),
  onLongPress: event => showMenu(event.clientX, event.clientY),
  onRangeDragMove: result => syncHandles(result),
  onPinchMove: pinch => setScale(baseScale * pinch.scaleDelta),
});

adapter.destroy();
```

常用参数：

- `spreadsheet`：x-spreadsheet 实例。
- `target`：接收 pointer 事件的 DOM 元素。
- `getSelected`：返回宿主维护的当前选区状态。
- `onSingleTap`：确认单击后触发。
- `onDoubleTap`：确认双击后触发。
- `onLongPress`：长按阈值达成后触发。
- `onRangeDragStart`：选区拖拽开始时触发。
- `onRangeDragMove`：选区拖拽移动时触发。
- `onRangeDragEnd`：选区拖拽结束时触发。
- `onPinchStart`：双指捏合开始时触发。
- `onPinchMove`：双指捏合移动时触发。
- `onPinchEnd`：双指捏合结束时触发。
- `isSelectionHandle`：识别宿主渲染的选区手柄。

默认阈值：

- `longPressMs = 550`
- `tapMoveTolerance = 10`
- `dragStartTolerance = 14`
- `doubleTapMs = 320`
- `doubleTapTolerance = 24`
- `edgeScroll = true`
- `edgeSize = 42`
- `edgeMaxSpeed = 18`

返回值：

```ts
{
  destroy: () => void
}
```

`destroy()` 会移除监听器、清理长按定时器和边缘滚动动画。

### 8.2 `cellRectByClientPoint(spreadsheet, clientX, clientY)`

将浏览器视口坐标转换为表格单元格 rect。

能力点：

- 支持外层 CSS transform 缩放。
- 不假设缩放比例为 1。
- 通过 overlay 实际渲染尺寸反推表格内部坐标。

返回值示例：

```js
{
  ri: 3,
  ci: 4,
  left: 320,
  top: 140,
  width: 80,
  height: 40
}
```

### 8.3 `selectedRangeIncludes(spreadsheet, ri, ci)`

判断行列索引是否位于当前选区内。

用途：

- 判断拖拽是否从当前选区内开始。
- 避免普通滚动被误判为拖选。

### 8.4 `getSelectedRange(spreadsheet)`

读取当前选区。

返回值形态：

```js
{
  sri: 1,
  sci: 1,
  eri: 3,
  eci: 4
}
```

### 8.5 `selectedRangeClientRect(spreadsheet)`

读取当前选区渲染后的 DOMRect。

用途：

- 宿主定位选区手柄。
- 宿主判断手柄是否需要隐藏。
- 缩放、resize 后重新对齐手柄。

### 8.6 `selectRangeEndByClientPoint(spreadsheet, clientX, clientY, options)`

把当前选区扩展到视口坐标下的目标单元格。

可选参数：

```js
{
  moving: true,
  anchor: { ri: 1, ci: 1 }
}
```

说明：

- `moving` 为 `true` 表示拖拽中。
- `moving` 为 `false` 表示 pointer 释放后的最终更新。
- `anchor` 用于选区手柄拖拽。
- 拖拽起点手柄时，anchor 通常是原选区终点。
- 拖拽终点手柄时，anchor 通常是原选区起点。

### 8.7 `resizeSpreadsheet(spreadsheet)`

根据实例能力选择 resize 方式。

优先级：

1. `spreadsheet.resize()`
2. `spreadsheet.reload()`
3. `spreadsheet.reRender()`
4. 原样返回 `spreadsheet`

## 9. 选区手柄接入

宿主自行渲染手柄：

```html
<button data-mobile-selection-handle="start"></button>
<button data-mobile-selection-handle="end"></button>
```

适配包默认通过以下规则识别手柄：

```js
event.target?.closest?.('[data-mobile-selection-handle]')
```

demo 中的手柄逻辑：

- 非编辑态展示。
- 编辑态隐藏。
- 双指捏合时隐藏。
- 选区不在可视区域内时隐藏。
- 根据 `selectedRangeClientRect(spreadsheet)` 定位。

## 10. demo 接入说明

主要接入文件：

```text
src/main.ts
src/styles.css
```

接入核心：

```js
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
```

demo 负责：

- 编辑器展示和隐藏。
- 输入框聚焦。
- 日期输入。
- 长按菜单展示。
- 选区手柄绘制。
- 缩放比例维护。
- 键盘高度同步。
- 表格可用高度计算。

适配包负责：

- 判断单击还是双击。
- 判断长按。
- 判断拖选。
- 判断捏合。
- 调用表格运行时更新选区。
- 在拖选靠近边缘时自动滚动。

## 11. 键盘与视口适配

移动端键盘问题主要来自：

- iOS Safari 输入框聚焦时页面整体滚动。
- Android WebView 可能调整 layout viewport。
- `visualViewport.height` 和 `window.innerHeight` 在不同环境中的含义不完全一致。
- 键盘弹起过程不是单帧完成，可能分阶段更新。

当前策略：

- 应用容器固定在视口内，避免页面整体滚动。
- 使用 `visualViewport` 计算键盘遮挡高度。
- 输入框聚焦后执行多次短延迟同步。
- 编辑器高度变化后重新计算表格可用高度。
- 表格 resize 后恢复宿主滚动位置，避免 canvas 跳动。

相关函数：

- `syncKeyboardOffset`
- `scheduleKeyboardSync`
- `getVisibleAppHeight`
- `getSheetViewportSize`
- `scheduleViewportUpdate`

## 12. 缩放适配

缩放方案：

- 宿主维护 `state.scale`。
- 外层 `sheet-scale` 通过 `transform: scale(...)` 缩放。
- 表格内部 canvas 使用反向逻辑尺寸。
- 捏合移动时先更新 CSS transform。
- 捏合结束后统一触发表格 resize。

这样做的好处：

- 捏合过程流畅。
- 避免每一帧都重建 canvas。
- 坐标转换仍可通过 overlay 实际尺寸反推。

## 13. 单元测试

测试框架：

```text
vitest
```

测试文件：

```text
packages/mobile-spreadsheet-adapter/src/index.test.ts
```

运行命令：

```bash
npm test
```

已覆盖：

- 坐标换算。
- 当前选区读取。
- 选区包含判断。
- 选区 DOM rect 获取。
- 选区扩展。
- 选区事件和渲染路径触发。
- 选区手柄锚点逻辑。
- resize / reload / reRender 优先级。
- 单击。
- 双击。
- 长按。
- 拖拽框选。
- 双指捏合。
- destroy 清理监听。

当前结果：

```text
Test Files  1 passed
Tests       12 passed
```

## 14. 构建与发布验证

构建命令：

```bash
npm run build
```

适配包 dry-run：

```bash
cd packages/mobile-spreadsheet-adapter
npm pack --dry-run
```

当前 dry-run 发布内容：

- `README.md`
- `package.json`
- `src/index.ts`

测试文件不会进入发布包。

## 15. 本地预览

启动服务：

```bash
npm run dev -- --host 127.0.0.1 --port 3463
```

访问：

```text
http://127.0.0.1:3463/
```

移动端真机预览可以使用：

- GitHub Pages
- 局域网 IP
- 隧道服务
- iOS 模拟器
- Android 模拟器

当前最稳定的外部预览方式是 GitHub Pages：

```text
https://maketwin.github.io/mobile-xspreadsheet-h5/
```

## 16. 已验证结果

已验证：

- `npm test` 通过。
- `npm run build` 通过。
- `npm pack --dry-run` 通过。
- 适配包发布清单不包含测试文件。
- 当前功能分支相对 `origin/main` 无 `src/vendor/x-spreadsheet` 差异。
- 本地浏览器验证过单击、拖拽选区、双击编辑。
- 初始化选区和手柄位置一致。
- 拖动右下手柄可扩大选区。
- 双击进入编辑后手柄隐藏。
- 键盘弹起后表格可用高度会重新计算。

## 17. 当前限制

当前仍未完整产品化的能力：

- 多单元格复制和粘贴。
- 行头、列头上的插入、删除、调整宽高菜单。
- 填充柄能力。
- 公式编辑栏。
- 撤销、重做命令的移动端封装。
- 更完整的真实 iOS / Android 机型矩阵测试。
- 横屏复杂编辑场景测试。
- 嵌入第三方 WebView 后的键盘行为测试。

这些限制不影响当前移动端适配包的核心交互验证，但如果作为业务生产组件发布，建议继续补齐。

## 18. 后续建议

优先级建议：

1. 补真实设备测试矩阵：iOS Safari、iOS WKWebView、Android Chrome、Android WebView。
2. 将 demo 中的底部编辑器和菜单抽成宿主示例组件。
3. 为适配包增加更多单测：边缘自动滚动、destroy 后不再触发回调、手柄自定义识别函数。
4. 增加复制粘贴和多单元格文本序列化能力。
5. 增加行列头移动端菜单。
6. 增加 CHANGELOG，明确每个版本支持的移动能力。
7. 如需发布 npm 包，补充包版本策略和 release 流程。

## 19. 常用命令

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev -- --host 127.0.0.1 --port 3463
```

运行单测：

```bash
npm test
```

运行类型检查：

```bash
npm run typecheck
```

构建：

```bash
npm run build
```

检查适配包发布内容：

```bash
cd packages/mobile-spreadsheet-adapter
npm pack --dry-run
```

确认没有修改 Excel 基座：

```bash
git diff --name-only origin/main..HEAD -- src/vendor/x-spreadsheet
```

## 20. 交付结论

当前项目已经从单一 demo 演进为“demo + 独立移动端适配包”的形态。

交付重点：

- 保持 Excel 基座稳定。
- 移动端适配能力通过包沉淀。
- demo 证明适配包可接入真实 x-spreadsheet 运行时。
- 公共 API 有中文注释和类型定义。
- 核心手势逻辑已有单元测试覆盖。
- 构建、测试、包 dry-run 均通过。

后续如果要进入业务项目，建议直接以 `packages/mobile-spreadsheet-adapter` 为核心接入对象，demo 仅作为参考实现。
