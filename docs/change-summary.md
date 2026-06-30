# Mobile X-Spreadsheet H5 改动总览

本文整理项目从最初 H5 Excel 移动端基座到当前成品的主要改动，便于后续 review、合并和继续迭代。

## 当前状态

- 本地项目：`/Users/sunxin/work/mobile-xspreadsheet-h5`
- 远端仓库：`https://github.com/maketwin/mobile-xspreadsheet-h5`
- 线上预览：`https://maketwin.github.io/mobile-xspreadsheet-h5/`
- 当前功能分支：`codex/optimize-mobile-spreadsheet-performance`
- 当前架构方向：不再修改 Excel 基座，移动端能力沉淀为独立 adapter package
- 当前工作区：提交本文档后应保持干净

## 阶段 1：H5 Excel 移动端基座

代表提交：

- `62af5d2 Build mobile x-spreadsheet demo`
- `1a3077d Improve mobile editor and spreadsheet layout`

完成内容：

- 基于 Vite 搭建 H5 demo。
- 引入 x-spreadsheet 类 Excel 表格渲染。
- 构造前端排期表 demo 数据。
- 实现移动端页面框架：顶部栏、表格区域、底部编辑器。
- 支持文本、数字、日期三类编辑入口。
- 单元格选中后，同步底部地址、类型和输入值。
- 保存后把底部输入值回写到表格数据。

## 阶段 2：缩放、键盘与视口适配

代表提交：

- `3d5c681 Reflow spreadsheet after zoom and edit focus`
- `1c3131c Improve mobile spreadsheet resizing and focus`
- `6f7c72b Fix mobile keyboard viewport gap`
- `89ac175 fix mobile editor keyboard positioning`
- `9c9c4d4 fix editor keyboard viewport offset`
- `2e49d94 remove dynamic visible height hook`

完成内容：

- 增加双指缩放能力，外层 `sheet-scale` 通过 CSS transform 缩放。
- 缩放后重新计算表格宽高，避免 canvas 与可视区域不匹配。
- 编辑器聚焦后重新计算表格尺寸，适配键盘弹起。
- 使用 `visualViewport` 处理移动端键盘高度与视口变化。
- 修复键盘弹起后表格上方出现空白、需要手动滚动才能看到表格的问题。
- 将应用容器固定在视口内，避免输入框聚焦触发页面整体滚动。
- 对 iOS / Android 不同键盘视口行为做兼容：视口已收缩时不重复叠加键盘偏移。

## 阶段 3：长按菜单与移动端编辑方案

代表提交：

- `2d23b97 Add mobile long press cell menu`

完成内容：

- 支持长按单元格弹出快捷菜单。
- 快捷菜单支持：
  - 编辑
  - 复制
  - 清空
  - 文本模式
  - 日期模式
  - 放大
  - 缩小
- 长按与双指缩放互斥，避免误触。
- 菜单位置会限制在应用可视区域内，避免被底部编辑器遮挡。

## 阶段 4：自维护 x-spreadsheet 源码

代表提交：

- `5cfe7fb Vendor spreadsheet engine for mobile patches`

完成内容：

- 将 `x-data-spreadsheet` 源码复制到 `src/vendor/x-spreadsheet`。
- 将 sprite 资源复制到 `src/vendor/assets/sprite.svg`。
- 移除对 npm 包 `x-data-spreadsheet` 的直接依赖。
- 改为从本地 vendored 源码导入 Spreadsheet。
- 为移动端直接 patch 表格引擎源码，避免黑盒依赖限制。

当前 vendored 源码关键移动端补丁：

- 内置触摸滚动忽略多指手势，让外层 pinch zoom 能工作。
- 内置 touchmove 不再强制 `preventDefault`。
- mobile 模式下禁用内置桌面编辑器。
- mobile 模式下禁用桌面键盘输入和 paste 处理。
- mobile 模式下移除 selector 隐藏 input，避免抢焦点。
- 顶层 Spreadsheet 暴露 `reload()` / `resize()`，方便外层完整重排。

> 需求变更说明：后续不再继续修改 Excel 基座源码。当前 `src/vendor/x-spreadsheet`
> 视为既有基座；新增移动端能力应放入独立适配包，通过实例对象、DOM 和事件桥接实现。

## 阶段 5：性能优化与压测能力

代表提交：

- `1683f33 optimize mobile spreadsheet performance`

完成内容：

- 缩放过程中合并重排，避免每一帧都重建 canvas。
- 手势移动时主要做 CSS transform，手势结束后再触发表格 resize。
- `scheduleViewportUpdate` 增加合并调度，减少重复 reload。
- 增加性能测试入口和指标面板。
- 增加 `scripts/perf-runner.mjs`，可进行大数据量渲染/滚动压测。
- 支持 1k、5k 等数据规模测试按钮。

## 阶段 6：移动端交互规则重构

代表提交：

- `8dfce02 Update mobile cell interaction gestures`
- `41d553a Show mobile editor only while editing`
- `052f35d Support mobile drag range selection`

当前交互规则：

- 单击：只选中单元格，不弹键盘，不展示底部编辑栏。
- 双击：进入编辑态，展示底部编辑栏，并聚焦输入框。
- 长按：弹出快捷菜单。
- 从当前选中单元格开始拖动：扩大或改变选区范围。
- 已经选中范围后，从范围内任意格子开始拖动：继续调整范围。
- 拖动框选时不会弹出底部编辑栏，不会误触发长按菜单。
- 双指缩放仍保持可用。

实现要点：

- 增加 tap 状态机，区分单击、双击、拖动、长按。
- 增加 `isEditing` 状态，底部编辑栏只在编辑态显示。
- 非编辑态下编辑栏 `display: none`，表格高度释放到完整可用空间。
- 保存、取消、点击表格其他区域后退出编辑态。
- 拖动框选能力改由移动适配包桥接基座运行时实例，不再要求 vendored `Sheet` 新增方法。
- 外层手势通过适配包更新真实选区，不额外画假框。

## 阶段 7：移动端外壳与触摸样式整理

代表提交：

- `dffae4f Polish mobile shell and touch styles`

完成内容：

- `index.html` 增加移动端 WebApp meta：
  - `user-scalable=no`
  - `theme-color`
  - iOS WebApp 配置
  - 关闭电话自动识别
- 增加安全区适配，顶部栏兼容刘海屏。
- 增加横屏紧凑布局，减少顶部栏和编辑器占用。
- 禁止表格区域文本选择，避免和长按菜单冲突。
- 输入框保留文本选择能力。
- 增加按钮触摸反馈。
- 增加 `overscroll-behavior`，减少页面橡皮筋/滚动串联。
- `.gitignore` 忽略 `src_backup-*` 备份目录。

## 阶段 8：移动端适配包化

代表提交：

- 本次包化提交：`Extract mobile adapter package`

变更背景：

- 新需求要求不能继续修改 Excel 基座。
- 移动端适配能力需要作为一个独立包沉淀，方便未来接入不同 Excel 基座或升级基座版本。

完成内容：

- 新增包目录：`packages/mobile-spreadsheet-adapter`。
- 包名：`@mobile-excel/x-spreadsheet-adapter`。
- 提供非侵入式 helper：
  - `cellRectByClientPoint`
  - `getSelectedRange`
  - `selectedRangeIncludes`
  - `selectedRangeClientRect`
  - `selectRangeEndByClientPoint`
  - `resizeSpreadsheet`
- demo 的移动端拖动框选、选区手柄拖拽改为通过适配包调用，不再要求 `src/vendor/x-spreadsheet` 新增方法。
- 当前功能分支相对 `origin/main` 不再包含 `src/vendor/x-spreadsheet` 差异。

包边界：

- 允许：读取 spreadsheet 实例运行时对象、读取 DOM 坐标、触发既有事件、调用既有 render/resize 能力。
- 不允许：修改 Excel 基座源码、fork 内部模块、把移动端 UI 写入基座。
- 应由宿主提供：底部编辑器 UI、菜单 UI、业务数据保存、权限和埋点。

## 当前成品能力清单

- Excel 风格 canvas 表格渲染。
- 自维护 x-spreadsheet 源码。
- 移动端单击选中。
- 移动端双击编辑。
- 移动端长按快捷菜单。
- 移动端拖动框选范围。
- 移动端拖动选区起点/终点手柄调整范围。
- 双指缩放。
- 键盘弹起适配。
- iOS / Android 视口差异兼容。
- 底部编辑栏仅编辑态展示。
- 文本、数字、日期编辑。
- 复制、清空、类型切换、缩放快捷操作。
- 大数据量性能测试入口。
- GitHub Pages 自动部署。
- 移动端适配包骨架。

## 验证记录

已多轮验证：

- `npm run build` 通过。
- 390 x 844 移动视口无横向溢出。
- 初始状态底部编辑栏隐藏。
- 单击单元格只选中，不进入编辑。
- 双击单元格显示编辑栏并聚焦输入框。
- 取消编辑后编辑栏收起。
- 从 `A2` 拖动到右下后地址显示 `A2:D5`。
- 拖动框选不会误弹编辑栏或长按菜单，并已改为适配包方式实现。
- 拖动右下角选区手柄后可扩大选区，编辑栏保持隐藏。
- 双击进入编辑后，选区手柄自动隐藏，避免遮挡输入。
- 缩放后 canvas 尺寸重新适配。
- 键盘弹起后不再出现上方大空白。
- 当前功能分支相对 `origin/main` 无 `src/vendor/x-spreadsheet` 差异。

## 待合并提交

当前功能分支相对 `origin/main` 的核心待合并内容：

```text
Extract mobile adapter package
df9f809 Document mobile spreadsheet changes
dffae4f Polish mobile shell and touch styles
052f35d Support mobile drag range selection
41d553a Show mobile editor only while editing
```

合并后主分支即可包含当前完整成品。
