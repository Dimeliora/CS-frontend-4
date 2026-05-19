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
        max-height: 400px;
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

    .counter {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 10px;
        background: rgba(124, 111, 247, 0.12);
        color: var(--accent-color, #7c6ff7);
        border: 1px solid rgba(124, 111, 247, 0.25);
    }

    .log-container {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .log-container::-webkit-scrollbar {
        width: 5px;
    }

    .log-container::-webkit-scrollbar-track {
        background: transparent;
    }

    .log-container::-webkit-scrollbar-thumb {
        background: var(--border-color, #2a2a3a);
        border-radius: 3px;
    }

    .log-entry {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 10px;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        animation: slideIn 0.3s ease;
    }

    .log-entry.step {
        border-left: 3px solid var(--border-color, #2a2a3a);
        background: rgba(16, 16, 26, 0.5);
        padding: 4px 10px;
        font-size: 10px;
    }

    .log-entry.step .log-icon {
        font-size: 10px;
    }

    .log-icon {
        font-size: 12px;
        flex-shrink: 0;
        margin-top: 1px;
    }

    .log-text {
        flex: 1;
        color: var(--text-color, #e0e0e8);
        line-height: 1.4;
    }

    .log-text .op-name {
        font-weight: 600;
    }

    .log-text .op-name.push { color: #98c379; }
    .log-text .op-name.pop { color: #e06c75; }
    .log-text .op-name.unshift { color: #56b6c2; }
    .log-text .op-name.shift { color: #e5c07b; }
    .log-text .op-name.at { color: var(--accent-color, #7c6ff7); }
    .log-text .op-name.extend { color: #c678dd; }

    .log-text .value {
        color: var(--accent-color, #7c6ff7);
        font-weight: 500;
    }

    .log-text .detail {
        color: var(--text-muted, #6a6a7a);
    }

    .log-time {
        color: var(--text-muted, #6a6a7a);
        font-size: 10px;
        flex-shrink: 0;
        margin-top: 1px;
    }

    .empty-state {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--text-muted, #6a6a7a);
        font-style: italic;
        text-align: center;
        padding: 24px;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-8px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
</style>

<div class="panel-header">
    <div class="panel-title">
        <span class="icon">📋</span>
        Лог операций
    </div>
    <span class="counter" id="counter">0</span>
</div>

<div class="log-container" id="log-container">
    <div class="empty-state">Операции будут отображаться здесь</div>
</div>
`;

export class OperationLog extends HTMLElement {
    #logContainer;
    #counter;
    #count = 0;
    #isEmpty = true;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.#logContainer = this.shadowRoot.getElementById('log-container');
        this.#counter = this.shadowRoot.getElementById('counter');
    }

    /**
     * Добавить запись в лог.
     * @param {string} icon - эмодзи
     * @param {string} html - HTML содержимое
     * @param {boolean} isStep - является ли промежуточным шагом
     */
    addEntry(icon, html, isStep = false) {
        if (this.#isEmpty) {
            this.#logContainer.innerHTML = '';
            this.#isEmpty = false;
        }

        const entry = document.createElement('div');
        entry.className = 'log-entry' + (isStep ? ' step' : '');

        const iconEl = document.createElement('span');
        iconEl.className = 'log-icon';
        iconEl.textContent = icon;
        entry.appendChild(iconEl);

        const textEl = document.createElement('span');
        textEl.className = 'log-text';
        textEl.innerHTML = html;
        entry.appendChild(textEl);

        if (!isStep) {
            this.#count++;
            this.#counter.textContent = this.#count;

            const timeEl = document.createElement('span');
            timeEl.className = 'log-time';
            timeEl.textContent = new Date().toLocaleTimeString('ru-RU');
            entry.appendChild(timeEl);
        }

        this.#logContainer.appendChild(entry);
        this.#logContainer.scrollTop = this.#logContainer.scrollHeight;
    }

    /**
     * Логировать операцию push
     */
    logPush(value, result) {
        this.addEntry('📥',
            `<span class="op-name push">push</span>(<span class="value">${value}</span>) → <span class="detail">size = ${result}</span>`
        );
    }

    /**
     * Логировать операцию pop
     */
    logPop(result) {
        if (result === undefined) {
            this.addEntry('📤',
                `<span class="op-name pop">pop</span>() → <span class="detail">undefined (пусто)</span>`
            );
        } else {
            this.addEntry('📤',
                `<span class="op-name pop">pop</span>() → <span class="value">${result}</span>`
            );
        }
    }

    /**
     * Логировать операцию unshift
     */
    logUnshift(value, result) {
        this.addEntry('⬅️',
            `<span class="op-name unshift">unshift</span>(<span class="value">${value}</span>) → <span class="detail">size = ${result}</span>`
        );
    }

    /**
     * Логировать операцию shift
     */
    logShift(result) {
        if (result === undefined) {
            this.addEntry('➡️',
                `<span class="op-name shift">shift</span>() → <span class="detail">undefined (пусто)</span>`
            );
        } else {
            this.addEntry('➡️',
                `<span class="op-name shift">shift</span>() → <span class="value">${result}</span>`
            );
        }
    }

    /**
     * Логировать операцию at
     */
    logAt(index, result) {
        this.addEntry('🔍',
            `<span class="op-name at">at</span>(<span class="value">${index}</span>) → <span class="value">${result === undefined ? 'undefined' : result}</span>`
        );
    }

    /**
     * Логировать реаллокацию
     */
    logExtend(oldCap, newCap) {
        this.addEntry('🔄',
            `<span class="op-name extend">extend</span>() — <span class="detail">capacity: ${oldCap} → ${newCap}</span>`
        );
    }

    /**
     * Логировать промежуточный шаг анимации
     */
    logStep(text) {
        this.addEntry('·', `<span class="detail">${text}</span>`, true);
    }

    /**
     * Очистить лог
     */
    clear() {
        this.#logContainer.innerHTML = '<div class="empty-state">Операции будут отображаться здесь</div>';
        this.#count = 0;
        this.#counter.textContent = '0';
        this.#isEmpty = true;
    }
}

customElements.define('operation-log', OperationLog);
