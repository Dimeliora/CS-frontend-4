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

    .op-group {
        margin-bottom: 14px;
    }

    .op-group-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--text-muted, #6a6a7a);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .op-row {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
    }

    input[type="text"],
    input[type="number"] {
        width: 80px;
        padding: 6px 10px;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 6px;
        color: var(--text-color, #e0e0e8);
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        outline: none;
        transition: border-color 0.2s;
    }

    input:focus {
        border-color: var(--accent-color, #7c6ff7);
    }

    button {
        padding: 6px 14px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
    }

    button:active {
        transform: scale(0.96);
    }

    .btn-push {
        background: rgba(152, 195, 121, 0.15);
        color: #98c379;
        border-color: rgba(152, 195, 121, 0.3);
    }
    .btn-push:hover {
        background: rgba(152, 195, 121, 0.25);
    }

    .btn-pop {
        background: rgba(224, 108, 117, 0.15);
        color: #e06c75;
        border-color: rgba(224, 108, 117, 0.3);
    }
    .btn-pop:hover {
        background: rgba(224, 108, 117, 0.25);
    }

    .btn-unshift {
        background: rgba(86, 182, 194, 0.15);
        color: #56b6c2;
        border-color: rgba(86, 182, 194, 0.3);
    }
    .btn-unshift:hover {
        background: rgba(86, 182, 194, 0.25);
    }

    .btn-shift {
        background: rgba(229, 192, 123, 0.15);
        color: #e5c07b;
        border-color: rgba(229, 192, 123, 0.3);
    }
    .btn-shift:hover {
        background: rgba(229, 192, 123, 0.25);
    }

    .btn-at {
        background: rgba(124, 111, 247, 0.15);
        color: var(--accent-color, #7c6ff7);
        border-color: rgba(124, 111, 247, 0.3);
    }
    .btn-at:hover {
        background: rgba(124, 111, 247, 0.25);
    }

    .btn-reset {
        background: rgba(108, 108, 128, 0.15);
        color: var(--text-muted, #6a6a7a);
        border-color: rgba(108, 108, 128, 0.3);
    }
    .btn-reset:hover {
        background: rgba(108, 108, 128, 0.25);
        color: var(--text-color, #e0e0e8);
    }

    .result-box {
        margin-top: 10px;
        padding: 8px 12px;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--text-muted, #6a6a7a);
        min-height: 32px;
        display: flex;
        align-items: center;
        transition: all 0.3s;
    }

    .result-box.success {
        color: #98c379;
        border-color: rgba(152, 195, 121, 0.3);
    }

    .result-box.error {
        color: #e06c75;
        border-color: rgba(224, 108, 117, 0.3);
    }

    .result-box.info {
        color: var(--accent-color, #7c6ff7);
        border-color: rgba(124, 111, 247, 0.3);
    }

    .speed-control {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--border-color, #2a2a3a);
    }

    .speed-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--text-muted, #6a6a7a);
    }

    input[type="range"] {
        flex: 1;
        accent-color: var(--accent-color, #7c6ff7);
        height: 4px;
    }

    .speed-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--accent-color, #7c6ff7);
        min-width: 50px;
        text-align: right;
    }
</style>

<div class="panel-header">
    <div class="panel-title">
        <span class="icon">⚡</span>
        Операции
    </div>
</div>

<div class="op-group">
    <div class="op-group-label">Вставка / Удаление (конец)</div>
    <div class="op-row">
        <input type="text" id="push-val" placeholder="значение">
        <button class="btn-push" id="btn-push">push</button>
        <button class="btn-pop" id="btn-pop">pop</button>
    </div>
</div>

<div class="op-group">
    <div class="op-group-label">Вставка / Удаление (начало)</div>
    <div class="op-row">
        <input type="text" id="unshift-val" placeholder="значение">
        <button class="btn-unshift" id="btn-unshift">unshift</button>
        <button class="btn-shift" id="btn-shift">shift</button>
    </div>
</div>

<div class="op-group">
    <div class="op-group-label">Доступ по индексу</div>
    <div class="op-row">
        <input type="number" id="at-idx" placeholder="index" min="0" value="0">
        <button class="btn-at" id="btn-at">at(i)</button>
        <button class="btn-reset" id="btn-reset">⟲ Сброс</button>
    </div>
</div>

<div class="speed-control">
    <span class="speed-label">⏱ Скорость:</span>
    <input type="range" id="speed-range" min="50" max="1000" value="300" step="50">
    <span class="speed-value" id="speed-value">300ms</span>
</div>

<div class="result-box" id="result-box">Готов к работе</div>
`;

export class OperationPanel extends HTMLElement {
    #resultBox;
    #speedRange;
    #speedValue;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.#resultBox = this.shadowRoot.getElementById('result-box');
        this.#speedRange = this.shadowRoot.getElementById('speed-range');
        this.#speedValue = this.shadowRoot.getElementById('speed-value');

        this.#setupListeners();
    }

    get animationDelay() {
        return Number(this.#speedRange.value);
    }

    #setupListeners() {
        // Push
        this.shadowRoot.getElementById('btn-push').addEventListener('click', () => {
            const input = this.shadowRoot.getElementById('push-val');
            const val = input.value.trim();
            if (!val) {
                this.showResult('Введите значение для push', 'error');
                return;
            }
            this.dispatchEvent(new CustomEvent('op-push', {
                bubbles: true, composed: true,
                detail: { value: isNaN(Number(val)) ? val : Number(val) }
            }));
            input.value = '';
        });

        // Pop
        this.shadowRoot.getElementById('btn-pop').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('op-pop', {
                bubbles: true, composed: true
            }));
        });

        // Unshift
        this.shadowRoot.getElementById('btn-unshift').addEventListener('click', () => {
            const input = this.shadowRoot.getElementById('unshift-val');
            const val = input.value.trim();
            if (!val) {
                this.showResult('Введите значение для unshift', 'error');
                return;
            }
            this.dispatchEvent(new CustomEvent('op-unshift', {
                bubbles: true, composed: true,
                detail: { value: isNaN(Number(val)) ? val : Number(val) }
            }));
            input.value = '';
        });

        // Shift
        this.shadowRoot.getElementById('btn-shift').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('op-shift', {
                bubbles: true, composed: true
            }));
        });

        // At
        this.shadowRoot.getElementById('btn-at').addEventListener('click', () => {
            const idx = Number(this.shadowRoot.getElementById('at-idx').value);
            this.dispatchEvent(new CustomEvent('op-at', {
                bubbles: true, composed: true,
                detail: { index: idx }
            }));
        });

        // Reset
        this.shadowRoot.getElementById('btn-reset').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('op-reset', {
                bubbles: true, composed: true
            }));
        });

        // Speed
        this.#speedRange.addEventListener('input', () => {
            this.#speedValue.textContent = this.#speedRange.value + 'ms';
        });

        // Enter на инпутах
        this.shadowRoot.getElementById('push-val').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.shadowRoot.getElementById('btn-push').click();
        });
        this.shadowRoot.getElementById('unshift-val').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.shadowRoot.getElementById('btn-unshift').click();
        });
        this.shadowRoot.getElementById('at-idx').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.shadowRoot.getElementById('btn-at').click();
        });
    }

    showResult(text, type = '') {
        this.#resultBox.textContent = text;
        this.#resultBox.className = 'result-box' + (type ? ` ${type}` : '');
    }

    setDisabled(disabled) {
        const buttons = this.shadowRoot.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = disabled);
    }
}

customElements.define('operation-panel', OperationPanel);
