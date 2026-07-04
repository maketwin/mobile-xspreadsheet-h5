// @ts-nocheck
import {
  createActionSelectSheet,
  createCascadePickerSheet,
  createSearchSelectSheet,
} from '../components/bottom-sheet.ts';

const costCenters = [
  { value: 'A001，电力一组', label: 'A001，电力一组', keywords: '成本中心 电力 一组 A001' },
  { value: 'A002，营销中心', label: 'A002，营销中心', keywords: '成本中心 营销 A002' },
  { value: 'A003，研发平台', label: 'A003，研发平台', keywords: '成本中心 研发 平台 A003' },
  { value: 'B001，客户成功部', label: 'B001，客户成功部', keywords: '客户 成功 B001' },
  { value: 'B002，项目交付部', label: 'B002，项目交付部', keywords: '项目 交付 B002' },
  { value: 'C001，供应链服务', label: 'C001，供应链服务', keywords: '供应链 服务 C001' },
  { value: 'D001，华东大区', label: 'D001，华东大区', keywords: '华东 大区 D001' },
];

const cityColumns = [
  {
    title: '省份',
    options: [
      { value: '河北省', label: '河北省' },
      { value: '山西省', label: '山西省' },
      { value: '辽宁省', label: '辽宁省' },
      { value: '浙江省', label: '浙江省' },
      { value: '吉林省', label: '吉林省' },
      { value: '黑龙江省', label: '黑龙江省' },
      { value: '内蒙古自治区', label: '内蒙古自治区' },
    ],
  },
  {
    title: '城市',
    options: [
      { value: '嘉兴市', label: '嘉兴市' },
      { value: '宁波市', label: '宁波市' },
      { value: '绍兴市', label: '绍兴市' },
      { value: '杭州市', label: '杭州市' },
      { value: '湖州市', label: '湖州市' },
      { value: '衢州市', label: '衢州市' },
      { value: '金华市', label: '金华市' },
    ],
  },
];

const travelPurposes = [
  { value: '找新线索', label: '找新线索' },
  { value: '赢单', label: '赢单' },
  { value: '收款', label: '收款' },
  { value: '维护客户关系', label: '维护客户关系' },
];

/**
 * 创建三个底部弹层示例，并统一通过 commitValue 回填当前单元格。
 */
export function createBottomSheetExamples({ commitValue, showGestureTip, mount }) {
  return {
    openCostCenter(currentValue = '') {
      const sheet = createSearchSelectSheet({
        title: '成本中心',
        mount,
        options: costCenters,
        value: currentValue,
        searchable: true,
        placeholder: '搜索',
        onChange(value) {
          commitValue(value || '');
          showGestureTip('已选择成本中心');
          sheet.destroy();
        },
      });
      sheet.show();
    },

    openCityPicker() {
      const sheet = createCascadePickerSheet({
        title: '选择城市',
        mount,
        columns: cityColumns,
        value: ['浙江省', '杭州市'],
        onConfirm(_values, options) {
          commitValue(options.map(option => option.label).join(' '));
          showGestureTip('已选择城市');
          sheet.destroy();
        },
      });
      sheet.show();
    },

    openTravelPurpose(currentValue = '') {
      const sheet = createActionSelectSheet({
        title: '出差目的',
        mount,
        options: travelPurposes,
        value: currentValue,
        onChange(value) {
          commitValue(value);
          showGestureTip('已选择出差目的');
          sheet.destroy();
        },
      });
      sheet.show();
    },
  };
}
