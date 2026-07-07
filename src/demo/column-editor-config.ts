export type ColumnEditorType = 'text' | 'number' | 'date' | 'bottom-sheet';

export interface ColumnEditorConfig {
  /** 从 0 开始的列索引。 */
  ci: number;
  /** 字段名，方便和后端列配置对齐。 */
  field: string;
  /** 列展示名。 */
  title: string;
  /** 点击单元格时打开的编辑器类型。 */
  editor: ColumnEditorType;
  /** editor 为 bottom-sheet 时，对应 bottomSheetConfigs 的 key。 */
  sheetKey?: string;
}

/**
 * demo 的列编辑配置。
 * 真实业务可以由后端返回后转换成这个结构，点击单元格时会按 ci 自动打开对应编辑器。
 */
export const columnEditorConfigs: ColumnEditorConfig[] = [
  {
    ci: 0,
    field: 'costCenter',
    title: '成本中心',
    editor: 'bottom-sheet',
    sheetKey: 'cost-center',
  },
  { ci: 1, field: 'version', title: '版本', editor: 'number' },
  { ci: 2, field: 'owner', title: '负责人', editor: 'text' },
  { ci: 3, field: 'city', title: '城市', editor: 'bottom-sheet', sheetKey: 'city' },
  { ci: 4, field: 'purpose', title: '出差目的', editor: 'bottom-sheet', sheetKey: 'purpose' },
  { ci: 5, field: 'date', title: '日期', editor: 'date' },
  { ci: 6, field: 'status', title: '状态', editor: 'text' },
];

export const defaultColumnEditorConfig: ColumnEditorConfig = {
  ci: -1,
  field: 'default',
  title: '文本',
  editor: 'text',
};

/**
 * 根据列索引获取编辑配置；未配置的列默认使用文本输入框。
 */
export function getColumnEditorConfig(ci: number): ColumnEditorConfig {
  return (
    columnEditorConfigs.find((config) => config.ci === ci) || {
      ...defaultColumnEditorConfig,
      ci,
    }
  );
}
