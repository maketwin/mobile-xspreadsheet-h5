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
 * 所有底部弹层都通过这张配置表展示。
 * 新增业务弹层时优先加配置，不需要改长按菜单或主流程。
 */
export const bottomSheetConfigs = [
  {
    key: 'cost-center',
    label: '成本中心',
    type: 'search-select',
    getValue: context => context.currentValue,
    props: {
      title: '成本中心',
      searchable: true,
      placeholder: '搜索',
      emptyText: '没有找到匹配的成本中心',
      remote: {
        url: '/api/cost-centers/search',
        keywordParam: 'keyword',
        debounceMs: 300,
        minKeywordLength: 1,
        request: mockCostCenterSearch,
      },
    },
    onSelected({ value, commitValue, showGestureTip }) {
      commitValue(value || '');
      showGestureTip('已选择成本中心');
    },
  },
  {
    key: 'city',
    label: '城市',
    type: 'cascade-picker',
    props: {
      title: '选择城市',
      columns: cityColumns,
      value: ['浙江省', '杭州市'],
    },
    onSelected({ options, commitValue, showGestureTip }) {
      commitValue(options.map(option => option.label).join(' '));
      showGestureTip('已选择城市');
    },
  },
  {
    key: 'purpose',
    label: '出差目的',
    type: 'action-select',
    getValue: context => context.currentValue,
    props: {
      title: '出差目的',
      options: travelPurposes,
    },
    onSelected({ value, commitValue, showGestureTip }) {
      commitValue(value);
      showGestureTip('已选择出差目的');
    },
  },
];

/**
 * 创建配置驱动的底部弹层控制器。
 */
export function createBottomSheetExamples({ commitValue, showGestureTip, mount }) {
  const controller = {
    configs: bottomSheetConfigs,

    open(key, context = {}) {
      const config = bottomSheetConfigs.find(item => item.key === key);
      if (!config) return null;
      return openSheetByConfig(config, {
        mount,
        ...context,
        currentValue: context.currentValue || '',
        commitValue,
        showGestureTip,
      });
    },

    openCostCenter(currentValue = '') {
      return this.open('cost-center', { currentValue });
    },

    openCityPicker() {
      return this.open('city');
    },

    openTravelPurpose(currentValue = '') {
      return this.open('purpose', { currentValue });
    },
  };
  return controller;
}

function openSheetByConfig(config, context) {
  if (config.type === 'search-select') return openSearchSelect(config, context);
  if (config.type === 'cascade-picker') return openCascadePicker(config, context);
  if (config.type === 'action-select') return openActionSelect(config, context);
  throw new Error(`未知底部弹层类型：${config.type}`);
}

function openSearchSelect(config, context) {
  let sheet = null;
  sheet = createSearchSelectSheet({
    ...config.props,
    mount: context.mount,
    value: config.getValue?.(context),
    onChange(value, option) {
      config.onSelected?.({ ...context, value, option });
      sheet.destroy();
    },
  });
  sheet.show();
  return sheet;
}

function openCascadePicker(config, context) {
  let sheet = null;
  sheet = createCascadePickerSheet({
    ...config.props,
    mount: context.mount,
    onConfirm(values, options) {
      config.onSelected?.({ ...context, values, options });
      sheet.destroy();
    },
  });
  sheet.show();
  return sheet;
}

function openActionSelect(config, context) {
  let sheet = null;
  sheet = createActionSelectSheet({
    ...config.props,
    mount: context.mount,
    value: config.getValue?.(context),
    onChange(value, option) {
      config.onSelected?.({ ...context, value, option });
      sheet.destroy();
    },
  });
  sheet.show();
  return sheet;
}

async function mockCostCenterSearch({ keyword, signal }) {
  await new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, 240);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('请求已取消', 'AbortError'));
    }, { once: true });
  });
  const normalized = keyword.trim().toLowerCase();
  return costCenters.filter((option) => {
    const haystack = `${option.label} ${option.keywords || ''}`.toLowerCase();
    return haystack.includes(normalized);
  });
}
