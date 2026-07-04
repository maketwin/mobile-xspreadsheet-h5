export interface BottomSheetAction {
  /** 按钮唯一值。 */
  key: string;
  /** 按钮展示文本。 */
  text: string;
  /** 是否使用主按钮样式。 */
  primary?: boolean;
}

export interface BottomSheetOptions {
  /** 弹层标题。 */
  title: string;
  /** 根节点，默认挂到 document.body。 */
  mount?: HTMLElement;
  /** 自定义类名，便于业务扩展样式。 */
  className?: string;
  /** 是否展示遮罩。 */
  mask?: boolean;
  /** 点击遮罩是否关闭。 */
  closeOnMask?: boolean;
  /** 是否展示右侧关闭按钮。 */
  closable?: boolean;
  /** 左右操作按钮配置。 */
  actions?: BottomSheetAction[];
  /** 弹层主体渲染函数。 */
  render: (body: HTMLElement, sheet: BottomSheet) => void;
  /** 点击头部操作按钮时触发。返回 false 可阻止自动关闭。 */
  onAction?: (key: string, sheet: BottomSheet) => boolean | void;
  /** 弹层关闭后触发。 */
  onClose?: () => void;
}

export interface SheetOption<T = string> {
  /** 选项唯一值。 */
  value: T;
  /** 选项展示文本。 */
  label: string;
  /** 可选说明文本。 */
  description?: string;
  /** 搜索关键字，默认使用 label。 */
  keywords?: string;
  /** 是否禁用。 */
  disabled?: boolean;
}

export interface SearchSelectSheetOptions<T = string> {
  title: string;
  mount?: HTMLElement;
  options: SheetOption<T>[];
  value?: T | T[] | null;
  multiple?: boolean;
  searchable?: boolean;
  placeholder?: string;
  emptyText?: string;
  onChange?: (value: T | T[] | null, option: SheetOption<T> | SheetOption<T>[] | null) => void;
}

export interface CascadeColumn<T = string> {
  title?: string;
  options: SheetOption<T>[];
}

export interface CascadePickerSheetOptions<T = string> {
  title: string;
  mount?: HTMLElement;
  columns: CascadeColumn<T>[];
  value?: T[];
  onConfirm?: (value: T[], options: SheetOption<T>[]) => void;
}

export interface ActionSelectSheetOptions<T = string> {
  title: string;
  mount?: HTMLElement;
  options: SheetOption<T>[];
  value?: T | null;
  onChange?: (value: T, option: SheetOption<T>) => void;
}

export class BottomSheet {
  private readonly options: BottomSheetOptions;
  private readonly root: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private open = false;

  constructor(options: BottomSheetOptions) {
    this.options = {
      mask: true,
      closeOnMask: true,
      closable: true,
      actions: [],
      ...options,
    };
    const mount = this.options.mount || document.body;
    this.root = document.createElement('div');
    this.root.className = `bottom-sheet-root${this.options.className ? ` ${this.options.className}` : ''}`;
    this.root.innerHTML = this.renderShell();
    this.panel = this.root.querySelector('.bottom-sheet-panel') as HTMLElement;
    this.body = this.root.querySelector('.bottom-sheet-body') as HTMLElement;
    mount.appendChild(this.root);
    this.bindEvents();
    this.options.render(this.body, this);
  }

  /** 打开弹层。 */
  show(): void {
    if (this.open) return;
    this.open = true;
    this.root.classList.add('mounted');
    requestAnimationFrame(() => this.root.classList.add('visible'));
  }

  /** 关闭弹层并保留 DOM，适合需要再次打开的场景。 */
  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('visible');
    window.setTimeout(() => {
      if (!this.open) this.root.classList.remove('mounted');
      this.options.onClose?.();
    }, 180);
  }

  /** 彻底销毁弹层 DOM。 */
  destroy(): void {
    this.root.remove();
  }

  /** 重新渲染主体内容。 */
  setContent(render: (body: HTMLElement, sheet: BottomSheet) => void): void {
    this.body.innerHTML = '';
    render(this.body, this);
  }

  private renderShell(): string {
    const leftActions = this.options.actions?.filter(action => !action.primary) || [];
    const rightActions = this.options.actions?.filter(action => action.primary) || [];
    return `
      ${this.options.mask ? '<div class="bottom-sheet-mask"></div>' : ''}
      <section class="bottom-sheet-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(this.options.title)}">
        <header class="bottom-sheet-header">
          <div class="bottom-sheet-actions left">${leftActions.map(action => this.renderAction(action)).join('')}</div>
          <strong class="bottom-sheet-title">${escapeHtml(this.options.title)}</strong>
          <div class="bottom-sheet-actions right">
            ${rightActions.map(action => this.renderAction(action)).join('')}
            ${this.options.closable ? '<button class="bottom-sheet-close" type="button" aria-label="关闭">×</button>' : ''}
          </div>
        </header>
        <div class="bottom-sheet-body"></div>
      </section>
    `;
  }

  private renderAction(action: BottomSheetAction): string {
    const primaryClass = action.primary ? ' primary' : '';
    return `<button class="bottom-sheet-action${primaryClass}" type="button" data-sheet-action="${escapeHtml(action.key)}">${escapeHtml(action.text)}</button>`;
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('.bottom-sheet-close')) {
        this.hide();
        return;
      }
      if (target.classList.contains('bottom-sheet-mask') && this.options.closeOnMask) {
        this.hide();
        return;
      }
      const action = target.closest('[data-sheet-action]') as HTMLElement | null;
      if (!action) return;
      const result = this.options.onAction?.(action.dataset.sheetAction || '', this);
      if (result !== false) this.hide();
    });
  }
}

/** 创建带搜索能力的列表选择弹层。 */
export function createSearchSelectSheet<T = string>(options: SearchSelectSheetOptions<T>): BottomSheet {
  const selected = new Set<T>();
  const initialValues = Array.isArray(options.value)
    ? options.value
    : options.value !== undefined && options.value !== null
      ? [options.value]
      : [];
  initialValues.forEach(value => selected.add(value));
  let keyword = '';

  function emitChange(sheet: BottomSheet): void {
    const values = [...selected];
    const selectedOptions = options.options.filter(option => selected.has(option.value));
    const value = options.multiple ? values : values[0] ?? null;
    const option = options.multiple ? selectedOptions : selectedOptions[0] ?? null;
    options.onChange?.(value, option);
    if (!options.multiple) sheet.hide();
  }

  function render(body: HTMLElement, sheet: BottomSheet): void {
    const normalized = keyword.trim().toLowerCase();
    const filtered = options.options.filter((option) => {
      const haystack = `${option.label} ${option.description || ''} ${option.keywords || ''}`.toLowerCase();
      return !normalized || haystack.includes(normalized);
    });
    body.innerHTML = `
      ${options.searchable !== false ? `
        <label class="sheet-search">
          <span>⌕</span>
          <input type="search" placeholder="${escapeHtml(options.placeholder || '搜索')}" value="${escapeHtml(keyword)}">
        </label>
      ` : ''}
      <div class="sheet-option-list">
        ${filtered.length
          ? filtered.map((option, index) => renderOption(option, selected.has(option.value), index)).join('')
          : `<div class="sheet-empty">${escapeHtml(options.emptyText || '暂无匹配选项')}</div>`}
      </div>
    `;

    body.querySelector('input')?.addEventListener('input', (event) => {
      keyword = (event.target as HTMLInputElement).value;
      sheet.setContent(render);
    });

    body.querySelectorAll<HTMLElement>('[data-option-value]').forEach((item) => {
      item.addEventListener('click', () => {
        const option = filtered[Number(item.dataset.optionIndex)];
        if (!option || option.disabled) return;
        if (options.multiple) {
          selected.has(option.value) ? selected.delete(option.value) : selected.add(option.value);
          sheet.setContent(render);
          emitChange(sheet);
          return;
        }
        selected.clear();
        selected.add(option.value);
        emitChange(sheet);
      });
    });
  }

  return new BottomSheet({
    title: options.title,
    mount: options.mount,
    className: 'bottom-sheet-select',
    render,
  });
}

/** 创建多列联动选择弹层。 */
export function createCascadePickerSheet<T = string>(options: CascadePickerSheetOptions<T>): BottomSheet {
  const selected = options.columns.map((column, index) => {
    const value = options.value?.[index];
    return column.options.findIndex(option => option.value === value) >= 0
      ? column.options.findIndex(option => option.value === value)
      : 0;
  });

  function currentOptions(): SheetOption<T>[] {
    return options.columns.map((column, index) => column.options[selected[index]]).filter(Boolean);
  }

  function render(body: HTMLElement): void {
    body.innerHTML = `
      <div class="cascade-picker">
        ${options.columns.map((column, columnIndex) => `
          <div class="cascade-column" data-column="${columnIndex}">
            ${column.options.map((option, optionIndex) => `
              <button class="cascade-option${selected[columnIndex] === optionIndex ? ' active' : ''}" type="button" data-option="${optionIndex}">
                ${escapeHtml(option.label)}
              </button>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
    body.querySelectorAll<HTMLElement>('.cascade-option').forEach((item) => {
      item.addEventListener('click', () => {
        const column = Number((item.closest('.cascade-column') as HTMLElement).dataset.column);
        selected[column] = Number(item.dataset.option);
        render(body);
      });
    });
  }

  return new BottomSheet({
    title: options.title,
    mount: options.mount,
    className: 'bottom-sheet-cascade',
    closable: false,
    actions: [
      { key: 'cancel', text: '取消' },
      { key: 'confirm', text: '确定', primary: true },
    ],
    render,
    onAction(key) {
      if (key === 'confirm') {
        const picked = currentOptions();
        options.onConfirm?.(picked.map(option => option.value), picked);
      }
    },
  });
}

/** 创建普通单选操作弹层。 */
export function createActionSelectSheet<T = string>(options: ActionSelectSheetOptions<T>): BottomSheet {
  return new BottomSheet({
    title: options.title,
    mount: options.mount,
    className: 'bottom-sheet-action-select',
    render(body, sheet) {
      body.innerHTML = `
        <div class="sheet-option-list plain">
          ${options.options.map((option, index) => renderOption(option, option.value === options.value, index)).join('')}
        </div>
      `;
      body.querySelectorAll<HTMLElement>('[data-option-value]').forEach((item) => {
        item.addEventListener('click', () => {
          const option = options.options[Number(item.dataset.optionIndex)];
          if (!option || option.disabled) return;
          options.onChange?.(option.value, option);
          sheet.hide();
        });
      });
    },
  });
}

function renderOption<T>(option: SheetOption<T>, active: boolean, index: number): string {
  return `
    <button class="sheet-option${active ? ' active' : ''}${option.disabled ? ' disabled' : ''}" type="button" data-option-value="${escapeHtml(String(option.value))}" data-option-index="${index}">
      <span class="sheet-option-text">
        <strong>${escapeHtml(option.label)}</strong>
        ${option.description ? `<em>${escapeHtml(option.description)}</em>` : ''}
      </span>
      <span class="sheet-option-check">✓</span>
    </button>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
