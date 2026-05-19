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

    .state-badges {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .badge-head {
        background: rgba(86, 182, 194, 0.12);
        color: #56b6c2;
        border: 1px solid rgba(86, 182, 194, 0.25);
    }

    .badge-tail {
        background: rgba(229, 192, 123, 0.12);
        color: #e5c07b;
        border: 1px solid rgba(229, 192, 123, 0.25);
    }

    .badge-size {
        background: rgba(124, 111, 247, 0.12);
        color: var(--accent-color, #7c6ff7);
        border: 1px solid rgba(124, 111, 247, 0.25);
    }

    .badge-cap {
        background: rgba(152, 195, 121, 0.12);
        color: #98c379;
        border: 1px solid rgba(152, 195, 121, 0.25);
    }

    .buffer-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
    }

    .buffer-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--text-muted, #6a6a7a);
    }

    .buffer-row {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        align-items: flex-end;
        min-height: 60px;
    }

    .cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        transition: all 0.3s ease;
    }

    .cell-index {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px;
        color: var(--text-muted, #6a6a7a);
    }

    .cell-box {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--border-color, #2a2a3a);
        border-radius: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-color, #e0e0e8);
        background: var(--input-bg, #10101a);
        transition: all 0.3s ease;
        position: relative;
    }

    .cell-box.empty {
        color: var(--text-muted, #6a6a7a);
        font-size: 11px;
        border-style: dashed;
        opacity: 0.5;
    }

    .cell-box.head {
        border-color: #56b6c2;
        box-shadow: 0 0 8px rgba(86, 182, 194, 0.3);
    }

    .cell-box.tail {
        border-color: #e5c07b;
        box-shadow: 0 0 8px rgba(229, 192, 123, 0.3);
    }

    .cell-box.head.tail {
        border-color: #98c379;
        box-shadow: 0 0 8px rgba(152, 195, 121, 0.3);
    }

    .cell-box.active {
        border-color: var(--accent-color, #7c6ff7);
        box-shadow: 0 0 12px rgba(124, 111, 247, 0.4);
        background: rgba(124, 111, 247, 0.1);
    }

    .cell-box.highlight-insert {
        border-color: #98c379;
        box-shadow: 0 0 12px rgba(152, 195, 121, 0.5);
        background: rgba(152, 195, 121, 0.15);
        animation: pulse-green 0.6s ease;
    }

    .cell-box.highlight-remove {
        border-color: #e06c75;
        box-shadow: 0 0 12px rgba(224, 108, 117, 0.5);
        background: rgba(224, 108, 117, 0.15);
        animation: pulse-red 0.6s ease;
    }

    .cell-box.highlight-move {
        border-color: #e5c07b;
        box-shadow: 0 0 12px rgba(229, 192, 123, 0.5);
        background: rgba(229, 192, 123, 0.15);
        animation: pulse-yellow 0.6s ease;
    }

    .cell-box.highlight-realloc {
        border-color: #c678dd;
        box-shadow: 0 0 12px rgba(198, 120, 221, 0.5);
        background: rgba(198, 120, 221, 0.15);
        animation: pulse-purple 0.6s ease;
    }

    .cell-pointer {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px;
        font-weight: 700;
        height: 14px;
        display: flex;
        gap: 2px;
    }

    .ptr-head {
        color: #56b6c2;
    }

    .ptr-tail {
        color: #e5c07b;
    }

    .logical-view {
        margin-top: 12px;
        padding: 10px 14px;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--text-muted, #6a6a7a);
        min-height: 36px;
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
    }

    .logical-view .lv-bracket {
        color: var(--text-muted, #6a6a7a);
    }

    .logical-view .lv-value {
        color: var(--accent-color, #7c6ff7);
        font-weight: 600;
    }

    .logical-view .lv-comma {
        color: var(--text-muted, #6a6a7a);
    }

    .logical-view .lv-label {
        color: var(--text-muted, #6a6a7a);
        font-size: 11px;
        margin-right: 6px;
    }

    @keyframes pulse-green {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
    }

    @keyframes pulse-red {
        0% { transform: scale(1); }
        50% { transform: scale(0.85); }
        100% { transform: scale(1); }
    }

    @keyframes pulse-yellow {
        0% { transform: scale(1); }
        30% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }

    @keyframes pulse-purple {
        0% { transform: scale(0.8); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }
</style>

<div class="panel-header">
    <div class="panel-title">
        <span class="icon">🧮</span>
        Кольцевой буфер
    </div>
    <div class="state-badges">
        <span class="badge badge-head">H: <span id="head-val">0</span></span>
        <span class="badge badge-tail">T: <span id="tail-val">0</span></span>
        <span class="badge badge-size">size: <span id="size-val">0</span></span>
        <span class="badge badge-cap">cap: <span id="cap-val">1</span></span>
    </div>
</div>

<div class="buffer-container">
    <div class="buffer-label">Физический буфер (buffer[])</div>
    <div class="buffer-row" id="buffer-row"></div>
</div>

<div class="logical-view" id="logical-view">
    <span class="lv-label">Логический:</span>
    <span class="lv-bracket">[</span>
    <span class="lv-bracket">]</span>
    <span style="color: var(--text-muted); font-style: italic; font-size: 11px;">пусто</span>
</div>
`;

export class BufferView extends HTMLElement {
    #headEl;
    #tailEl;
    #sizeEl;
    #capEl;
    #bufferRow;
    #logicalView;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.#headEl = this.shadowRoot.getElementById('head-val');
        this.#tailEl = this.shadowRoot.getElementById('tail-val');
        this.#sizeEl = this.shadowRoot.getElementById('size-val');
        this.#capEl = this.shadowRoot.getElementById('cap-val');
        this.#bufferRow = this.shadowRoot.getElementById('buffer-row');
        this.#logicalView = this.shadowRoot.getElementById('logical-view');
    }

    /**
     * Обновить визуализацию буфера.
     * @param {object} state - { buffer, head, tail, size, capacity }
     * @param {object} [highlights] - { index, type } массив подсветок
     */
    render(state, highlights = []) {
        const { buffer, head, tail, size, capacity } = state;

        this.#headEl.textContent = head;
        this.#tailEl.textContent = tail;
        this.#sizeEl.textContent = size;
        this.#capEl.textContent = capacity;

        // Физический буфер
        this.#bufferRow.innerHTML = '';
        for (let i = 0; i < capacity; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            // Указатели
            const pointerEl = document.createElement('div');
            pointerEl.className = 'cell-pointer';
            const isHead = i === head;
            const isTail = i === tail;
            if (isHead) {
                const h = document.createElement('span');
                h.className = 'ptr-head';
                h.textContent = 'H';
                pointerEl.appendChild(h);
            }
            if (isTail) {
                const t = document.createElement('span');
                t.className = 'ptr-tail';
                t.textContent = 'T';
                pointerEl.appendChild(t);
            }
            cell.appendChild(pointerEl);

            // Ячейка
            const box = document.createElement('div');
            box.className = 'cell-box';
            
            if (buffer[i] === undefined) {
                box.classList.add('empty');
                box.textContent = '—';
            } else {
                box.textContent = String(buffer[i]);
            }

            if (isHead && size > 0) box.classList.add('head');
            if (isTail) box.classList.add('tail');

            // Подсветки
            for (const hl of highlights) {
                if (hl.index === i) {
                    box.classList.add(`highlight-${hl.type}`);
                }
            }

            cell.appendChild(box);

            // Индекс
            const idxEl = document.createElement('div');
            idxEl.className = 'cell-index';
            idxEl.textContent = i;
            cell.appendChild(idxEl);

            this.#bufferRow.appendChild(cell);
        }

        // Логический вид
        this.#logicalView.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'lv-label';
        label.textContent = 'Логический:';
        this.#logicalView.appendChild(label);

        const openBr = document.createElement('span');
        openBr.className = 'lv-bracket';
        openBr.textContent = '[';
        this.#logicalView.appendChild(openBr);

        if (size === 0) {
            const closeBr = document.createElement('span');
            closeBr.className = 'lv-bracket';
            closeBr.textContent = ']';
            this.#logicalView.appendChild(closeBr);

            const emptyNote = document.createElement('span');
            emptyNote.style.cssText = 'color: var(--text-muted); font-style: italic; font-size: 11px; margin-left: 6px;';
            emptyNote.textContent = 'пусто';
            this.#logicalView.appendChild(emptyNote);
        } else {
            for (let i = 0; i < size; i++) {
                if (i > 0) {
                    const comma = document.createElement('span');
                    comma.className = 'lv-comma';
                    comma.textContent = ',';
                    this.#logicalView.appendChild(comma);
                }
                const val = document.createElement('span');
                val.className = 'lv-value';
                const physIdx = (head + i) % capacity;
                val.textContent = String(buffer[physIdx]);
                this.#logicalView.appendChild(val);
            }
            const closeBr = document.createElement('span');
            closeBr.className = 'lv-bracket';
            closeBr.textContent = ']';
            this.#logicalView.appendChild(closeBr);
        }
    }

    /**
     * Получить снимок состояния из FreeShiftableArray
     */
    static snapshot(arr) {
        return {
            buffer: [...arr.buffer],
            head: arr.head,
            tail: arr.tail,
            size: arr.size,
            capacity: arr.capacity,
        };
    }
}

customElements.define('buffer-view', BufferView);
