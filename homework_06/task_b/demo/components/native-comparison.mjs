const template = document.createElement('template');
template.innerHTML = `
<style>
    :host {
        display: flex;
        flex-direction: column;
        background: var(--panel-bg, #1a1a28);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 12px;
        padding: 20px;
    }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
    }

    .panel-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-color, #e0e0e8);
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .panel-title .icon {
        font-size: 16px;
    }

    .comparison-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    .comp-column {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .comp-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--border-color, #2a2a3a);
    }

    .comp-label.custom {
        color: var(--accent-color, #7c6ff7);
    }

    .comp-label.native {
        color: #e5c07b;
    }

    .comp-array-view {
        padding: 8px 10px;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--text-muted, #6a6a7a);
        min-height: 32px;
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        word-break: break-all;
    }

    .comp-array-view .val {
        color: var(--text-color, #e0e0e8);
        font-weight: 500;
    }

    .comp-array-view .bracket {
        color: var(--text-muted, #6a6a7a);
    }

    .comp-timing {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        padding: 6px 10px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .comp-timing.custom {
        background: rgba(124, 111, 247, 0.08);
        color: var(--accent-color, #7c6ff7);
        border: 1px solid rgba(124, 111, 247, 0.15);
    }

    .comp-timing.native {
        background: rgba(229, 192, 123, 0.08);
        color: #e5c07b;
        border: 1px solid rgba(229, 192, 123, 0.15);
    }

    .native-steps {
        margin-top: 8px;
        padding: 10px;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 8px;
        max-height: 120px;
        overflow-y: auto;
    }

    .native-steps::-webkit-scrollbar {
        width: 5px;
    }

    .native-steps::-webkit-scrollbar-track {
        background: transparent;
    }

    .native-steps::-webkit-scrollbar-thumb {
        background: var(--border-color, #2a2a3a);
        border-radius: 3px;
    }

    .step-row {
        display: flex;
        gap: 6px;
        align-items: center;
        padding: 3px 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--text-muted, #6a6a7a);
        border-bottom: 1px solid rgba(42, 42, 58, 0.5);
    }

    .step-row:last-child {
        border-bottom: none;
    }

    .step-num {
        color: var(--text-muted, #6a6a7a);
        min-width: 20px;
    }

    .step-action {
        color: #e5c07b;
        font-weight: 500;
    }

    .step-detail {
        color: var(--text-color, #e0e0e8);
        flex: 1;
    }

    .step-row.move .step-action {
        color: #e06c75;
    }

    .verdict {
        margin-top: 10px;
        padding: 8px 12px;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        text-align: center;
    }

    .verdict.win {
        background: rgba(152, 195, 121, 0.1);
        color: #98c379;
        border: 1px solid rgba(152, 195, 121, 0.2);
    }

    .verdict.lose {
        background: rgba(224, 108, 117, 0.1);
        color: #e06c75;
        border: 1px solid rgba(224, 108, 117, 0.2);
    }

    .verdict.tie {
        background: rgba(86, 182, 194, 0.1);
        color: #56b6c2;
        border: 1px solid rgba(86, 182, 194, 0.2);
    }

    .empty-state {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--text-muted, #6a6a7a);
        font-style: italic;
        text-align: center;
        padding: 16px;
    }

    .grid-full {
        grid-column: 1 / -1;
    }
</style>

<div class="panel-header">
    <div class="panel-title">
        <span class="icon">⚖️</span>
        Сравнение с Array
    </div>
</div>

<div id="content">
    <div class="empty-state">Выполните операцию для сравнения</div>
</div>
`;

export class NativeComparison extends HTMLElement {
    #content;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.#content = this.shadowRoot.getElementById('content');
    }

    /**
     * Показать сравнение операции.
     * @param {object} data
     *   - operation: string
     *   - customResult: { value, array, time }
     *   - nativeResult: { value, array, time, steps }
     */
    showComparison(data) {
        const { operation, customResult, nativeResult } = data;

        this.#content.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'comparison-grid';

        // Заголовки
        const customLabel = document.createElement('div');
        customLabel.className = 'comp-label custom';
        customLabel.textContent = `FreeShiftableArray.${operation}`;
        grid.appendChild(customLabel);

        const nativeLabel = document.createElement('div');
        nativeLabel.className = 'comp-label native';
        nativeLabel.textContent = `Array.${operation}`;
        grid.appendChild(nativeLabel);

        // Массивы
        grid.appendChild(this.#renderArray(customResult.array));
        grid.appendChild(this.#renderArray(nativeResult.array));

        // Тайминги
        const customTiming = document.createElement('div');
        customTiming.className = 'comp-timing custom';
        customTiming.textContent = `⚡ O(1) — ${customResult.time.toFixed(3)}ms`;
        grid.appendChild(customTiming);

        const nativeTiming = document.createElement('div');
        nativeTiming.className = 'comp-timing native';
        nativeTiming.textContent = `🐢 ${nativeResult.complexity} — ${nativeResult.time.toFixed(3)}ms`;
        grid.appendChild(nativeTiming);

        this.#content.appendChild(grid);

        // Шаги нативного массива (для shift/unshift)
        if (nativeResult.steps && nativeResult.steps.length > 0) {
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'native-steps';

            const stepsTitle = document.createElement('div');
            stepsTitle.style.cssText = 'font-family: "JetBrains Mono", monospace; font-size: 10px; color: var(--text-muted); margin-bottom: 6px; font-weight: 600;';
            stepsTitle.textContent = `📋 Шаги Array.${operation} (${nativeResult.steps.length} операций):`;
            stepsContainer.appendChild(stepsTitle);

            for (let i = 0; i < nativeResult.steps.length; i++) {
                const step = nativeResult.steps[i];
                const row = document.createElement('div');
                row.className = 'step-row' + (step.type === 'move' ? ' move' : '');

                const num = document.createElement('span');
                num.className = 'step-num';
                num.textContent = `${i + 1}.`;
                row.appendChild(num);

                const action = document.createElement('span');
                action.className = 'step-action';
                action.textContent = step.action;
                row.appendChild(action);

                const detail = document.createElement('span');
                detail.className = 'step-detail';
                detail.textContent = step.detail;
                row.appendChild(detail);

                stepsContainer.appendChild(row);
            }

            this.#content.appendChild(stepsContainer);
        }

        // Вердикт
        const verdict = document.createElement('div');
        const isShiftOp = operation === 'shift' || operation === 'unshift';
        if (isShiftOp) {
            verdict.className = 'verdict win';
            verdict.textContent = `✅ FreeShiftableArray.${operation} — O(1) vs Array.${operation} — O(n). Кольцевой буфер не перемещает элементы!`;
        } else {
            verdict.className = 'verdict tie';
            verdict.textContent = `🔄 Обе структуры выполняют ${operation} за O(1)`;
        }
        this.#content.appendChild(verdict);
    }

    #renderArray(arr) {
        const view = document.createElement('div');
        view.className = 'comp-array-view';

        const open = document.createElement('span');
        open.className = 'bracket';
        open.textContent = '[';
        view.appendChild(open);

        for (let i = 0; i < arr.length; i++) {
            if (i > 0) {
                const comma = document.createElement('span');
                comma.className = 'bracket';
                comma.textContent = ', ';
                view.appendChild(comma);
            }
            const val = document.createElement('span');
            val.className = 'val';
            val.textContent = String(arr[i]);
            view.appendChild(val);
        }

        const close = document.createElement('span');
        close.className = 'bracket';
        close.textContent = ']';
        view.appendChild(close);

        return view;
    }

    reset() {
        this.#content.innerHTML = '<div class="empty-state">Выполните операцию для сравнения</div>';
    }
}

customElements.define('native-comparison', NativeComparison);
