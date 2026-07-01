# Mobile X-Spreadsheet H5

基于 `x-data-spreadsheet` 的 H5 移动端 Excel 适配 demo。

## 功能

- 渲染类 Excel 的 canvas 表格
- 移动端底部单元格编辑器
- 文本、数字、日期编辑
- 单元格内容回写到表格
- 双指捏合缩放手势层
- 基于 `visualViewport` 的键盘遮挡适配
- 移动端长按单元格菜单
- 移动端拖拽框选和选区手柄调整
- 非侵入式移动适配包和类型定义

## Excel 基座边界

Excel 引擎源码放在：

```text
src/vendor/x-spreadsheet
```

当前方向是保持 Excel 基座稳定。移动端能力应通过适配包和 demo 接入层实现，不再修改 `src/vendor/x-spreadsheet`。

适配包边界：

- 允许：读取 spreadsheet 运行时实例和 DOM 几何信息，调用已有选区、渲染、resize 能力，通过回调暴露移动端手势。
- 不允许：修改表格渲染器、fork 内部模块、把移动端 UI 写入 Excel 基座。
- 宿主负责：底部编辑器、长按菜单、选区手柄、缩放 UI、数据保存、权限和埋点。

## 移动端适配包

新增移动端能力应放在 Excel 基座之外。

适配包位置：

```text
packages/mobile-spreadsheet-adapter
```

它提供非侵入式入口 `mountMobileSpreadsheetAdapter`，以及一组移动端适配 helper，包括：客户端坐标转单元格、拖拽框选、选区手柄调整、边缘自动滚动、双指捏合回调、表格 resize 桥接。

适配包已补齐 JSDoc 注释和 `src/index.ts` 类型定义，业务项目接入时可以获得编辑器提示。

## 完整文档

- [H5 Excel 移动端适配完整中文文档](docs/mobile-excel-adapter-full-guide.md)
- [项目改动总览](docs/change-summary.md)

## 本地预览

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 3462
```

打开：

```text
http://127.0.0.1:3462/
```

## GitHub Pages

项目包含 `.github/workflows/pages.yml`。

推送到 GitHub 仓库后，将 Pages 的来源设置为 GitHub Actions：

```bash
gh api --method POST repos/OWNER/REPO/pages -f build_type=workflow
```

之后推送到 `main`，或手动运行 `Deploy GitHub Pages` workflow。
