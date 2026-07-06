export const columns = ['成本中心', '版本', '负责人', '出发城市', '出差目的', '日期', '状态'];

/** demo 首屏使用的基础排期数据。 */
export const rows = [
  ['A001，电力一组', '0.3', '郭绵翔', '杭州市', '维护客户关系', '2026-06-08', '进行中'],
  ['A002，营销中心', '0.1', '李良国', '宁波市', '找新线索', '2026-06-09', '已完成'],
  ['A001，电力一组', '0.3', '郭绵翔', '绍兴市', '赢单', '2026-06-10', '进行中'],
  ['A003，研发平台', '0.3', '郭绵翔', '湖州市', '收款', '2026-06-11', '待确认'],
  ['B001，客户成功部', '0.3', '郭绵翔', '嘉兴市', '维护客户关系', '2026-06-12', '待确认'],
  ['B002，项目交付部', '0.2', '涂辉', '衢州市', '找新线索', '2026-06-13', '风险'],
  ['C001，供应链服务', '0.2', '涂辉', '金华市', '赢单', '2026-06-14', '进行中'],
  ['D001，华东大区', '0.2', '涂辉', '杭州市', '收款', '2026-06-15', '进行中'],
  ['A001，电力一组', '0.3', '郭绵翔', '宁波市', '维护客户关系', '2026-06-16', '已完成'],
  ['A002，营销中心', '0.3', '郭绵翔', '绍兴市', '找新线索', '2026-06-17', '进行中'],
  ['A003，研发平台', '1.1', '李星达', '湖州市', '赢单', '2026-06-18', '风险'],
  ['B001，客户成功部', '1.1', '李星达', '嘉兴市', '收款', '2026-06-19', '进行中'],
  ['B002，项目交付部', '1.2', '吕俊伶', '衢州市', '维护客户关系', '2026-06-20', '待确认'],
  ['C001，供应链服务', '1.3', '魏伟剑', '金华市', '找新线索', '2026-06-21', '进行中'],
  ['D001，华东大区', '1.4', '冯亦磊', '杭州市', '赢单', '2026-06-22', '已完成'],
];

/**
 * 构建首屏演示表格数据，保持数据量较小，便于调试移动端交互。
 */
export function buildSheetData(sourceRows = rows) {
  const rowData: Record<number, { cells: Record<number, { text: string; style: number }> }> = {};
  rowData[0] = { cells: {} };
  columns.forEach((text, ci) => {
    rowData[0].cells[ci] = { text, style: 1 };
  });

  sourceRows.forEach((row, ri) => {
    const rowCells: Record<number, { text: string; style: number }> = {};
    row.forEach((text, ci) => {
      rowCells[ci] = {
        text,
        style: ci === 5 ? 2 : 0,
      };
    });
    rowData[ri + 1] = { cells: rowCells };
  });

  return {
    name: '前端排期表',
    freeze: 'A2',
    styles: [
      { align: 'center', valign: 'middle' },
      { bgcolor: '#eef5ff', color: '#1677ff', bold: true, align: 'left', valign: 'middle' },
      { color: '#087a5a', align: 'center' },
    ],
    rows: { len: 120, ...rowData },
    cols: {
      len: 26,
      0: { width: 92 },
      1: { width: 70 },
      2: { width: 94 },
      3: { width: 92 },
      4: { width: 260 },
      5: { width: 112 },
      6: { width: 92 },
    },
  };
}

/**
 * 构建大数据量性能测试表格，支持指定行数和列数。
 */
export function buildLargeSheetData(rowCount = 1000, colCount = 50) {
  const rowData: Record<number, { cells: Record<number, { text: string; style: number }> }> = {};
  const statusValues = ['进行中', '待确认', '已完成', '风险'];
  const systems = ['OA', 'MES', 'ERP', '回放', '应用市场', 'AI代码生成'];
  const owners = ['郭绵翔', '李良国', '涂辉', '李星达', '吕俊伶', '魏伟剑', '冯亦磊'];
  const statusStyleMap: Record<string, number> = {
    进行中: 4,
    待确认: 5,
    已完成: 6,
    风险: 7,
  };

  rowData[0] = { cells: {} };
  for (let ci = 0; ci < colCount; ci += 1) {
    rowData[0].cells[ci] = { text: ci < columns.length ? columns[ci] : `字段${ci + 1}`, style: 1 };
  }

  for (let ri = 1; ri < rowCount; ri += 1) {
    const rowCells: Record<number, { text: string; style: number }> = {};
    for (let ci = 0; ci < colCount; ci += 1) {
      let text = '';
      let style = 0;
      if (ri % 2 === 0) style = 3;
      if (ci === 0) {
        text = ri % 3 === 0 ? '移动组' : ri % 3 === 1 ? 'WEB一组' : '平台组';
        style = 8 + (ri % 3);
      } else if (ci === 1) {
        text = `${(ri % 6) + 1}.${ci % 4}`;
        style = 11;
      } else if (ci === 2) {
        text = owners[ri % owners.length];
        style = 12;
      } else if (ci === 3) {
        text = systems[ri % systems.length];
        style = 13;
      } else if (ci === 4) {
        text = `性能测试需求-${ri}-${ci}`;
        style = ri % 5 === 0 ? 14 : style;
      } else if (ci === 5) {
        text = `2026-06-${String((ri % 28) + 1).padStart(2, '0')}`;
        style = 2;
      } else if (ci === 6) {
        text = statusValues[ri % statusValues.length];
        style = statusStyleMap[text];
      } else if (ci % 12 === 0 && ri > 2) {
        text = `=SUM(B${ri}:C${ri})`;
        style = 15;
      } else {
        text = `${ri}-${ci}`;
        if (ci % 8 === 0) style = 16;
        if (ci % 10 === 0) style = 17;
      }
      rowCells[ci] = { text, style };
    }
    rowData[ri] = { cells: rowCells };
  }

  return {
    name: `性能测试 ${rowCount}x${colCount}`,
    freeze: 'A2',
    styles: [
      { align: 'center', valign: 'middle' },
      {
        bgcolor: '#e8f1ff',
        color: '#1455d9',
        font: { bold: true },
        align: 'left',
        valign: 'middle',
        border: { bottom: ['medium', '#9bbcf7'] },
      },
      { color: '#087a5a', align: 'center' },
      { bgcolor: '#f8fafc', color: '#334155', align: 'center' },
      { bgcolor: '#e8f7ee', color: '#087a5a', font: { bold: true }, align: 'center' },
      { bgcolor: '#fff7e6', color: '#b25e09', font: { bold: true }, align: 'center' },
      { bgcolor: '#eaf2ff', color: '#175cd3', font: { bold: true }, align: 'center' },
      { bgcolor: '#fff1f2', color: '#b42318', font: { bold: true }, align: 'center' },
      { bgcolor: '#edf7ff', color: '#175cd3', align: 'center' },
      { bgcolor: '#f0fdf4', color: '#15803d', align: 'center' },
      { bgcolor: '#fef3c7', color: '#92400e', align: 'center' },
      { color: '#475467', align: 'center' },
      { color: '#344054', font: { bold: true }, align: 'center' },
      { bgcolor: '#f7f5ff', color: '#6941c6', align: 'center' },
      { bgcolor: '#fff', color: '#111827', align: 'left', textwrap: true },
      { bgcolor: '#f1f5f9', color: '#475467', align: 'right' },
      { color: '#0f766e', align: 'right' },
      { color: '#7c3aed', font: { italic: true }, align: 'center' },
    ],
    rows: { len: rowCount, ...rowData },
    cols: {
      len: colCount,
      0: { width: 92 },
      1: { width: 70 },
      2: { width: 94 },
      3: { width: 92 },
      4: { width: 260 },
      5: { width: 112 },
      6: { width: 92 },
    },
  };
}
