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
        overflow: hidden;
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

    .return-code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        padding: 3px 10px;
        border-radius: 12px;
        display: none;
    }

    .return-code.success {
        display: inline-block;
        background: rgba(152, 195, 121, 0.15);
        color: var(--success-color, #98c379);
        border: 1px solid rgba(152, 195, 121, 0.3);
    }

    .return-code.error {
        display: inline-block;
        background: rgba(224, 108, 117, 0.12);
        color: var(--error-color, #e06c75);
        border: 1px solid rgba(224, 108, 117, 0.25);
    }

    .output-area {
        width: 100%;
        flex: 1;
        min-height: 80px;
        overflow-y: auto;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 8px;
        padding: 12px 14px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: var(--text-color, #e0e0e8);
    }

    .output-area::-webkit-scrollbar {
        width: 6px;
    }

    .output-area::-webkit-scrollbar-track {
        background: transparent;
    }

    .output-area::-webkit-scrollbar-thumb {
        background: var(--border-color, #2a2a3a);
        border-radius: 3px;
    }

    .output-line {
        padding: 1px 0;
    }

    .output-line.print-val {
        color: var(--accent-color, #7c6ff7);
    }

    .output-line.info {
        color: var(--text-muted, #6a6a7a);
        font-size: 11px;
    }

    .output-line.error {
        color: var(--error-color, #e06c75);
    }

    .output-line.success {
        color: var(--success-color, #98c379);
    }

    .empty-state {
        color: var(--text-muted, #6a6a7a);
        font-size: 12px;
        text-align: center;
        padding: 40px 0;
    }

    .empty-state .big-icon {
        font-size: 32px;
        display: block;
        margin-bottom: 8px;
    }
</style>

<div class="panel-header">
    <span class="panel-title"><span class="icon">📺</span> Вывод</span>
    <span class="return-code" id="return-code"></span>
</div>

<div class="output-area" id="output">
    <div class="empty-state">
        <span class="big-icon">⌨️</span>
        Введите программу и нажмите «Выполнить»
    </div>
</div>
`;

export class OutputDisplay extends HTMLElement {
    #output;
    #returnCode;
    #hasContent = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.#output = this.shadowRoot.getElementById('output');
        this.#returnCode = this.shadowRoot.getElementById('return-code');
    }

    clear() {
        this.#output.innerHTML = '';
        this.#returnCode.className = 'return-code';
        this.#returnCode.textContent = '';
        this.#hasContent = false;
    }

    /** Добавить строку вывода PRINT A */
    appendPrint(value) {
        this.#ensureContent();
        const line = document.createElement('div');
        line.className = 'output-line print-val';
        line.textContent = String(value);
        this.#output.appendChild(line);
        this.#scrollToBottom();
    }

    /** Добавить информационную строку */
    appendInfo(text) {
        this.#ensureContent();
        const line = document.createElement('div');
        line.className = 'output-line info';
        line.textContent = text;
        this.#output.appendChild(line);
        this.#scrollToBottom();
    }

    /** Добавить строку ошибки */
    appendError(text) {
        this.#ensureContent();
        const line = document.createElement('div');
        line.className = 'output-line error';
        line.textContent = '⚠ ' + text;
        this.#output.appendChild(line);
        this.#scrollToBottom();
    }

    /** Добавить строку успеха */
    appendSuccess(text) {
        this.#ensureContent();
        const line = document.createElement('div');
        line.className = 'output-line success';
        line.textContent = '✓ ' + text;
        this.#output.appendChild(line);
        this.#scrollToBottom();
    }

    /** Показать код возврата */
    showReturnCode(code) {
        this.#returnCode.textContent = `return ${code}`;
        this.#returnCode.className = code === 0
            ? 'return-code success'
            : 'return-code error';
    }

    #ensureContent() {
        if (!this.#hasContent) {
            this.#output.innerHTML = '';
            this.#hasContent = true;
        }
    }

    #scrollToBottom() {
        this.#output.scrollTop = this.#output.scrollHeight;
    }
}

customElements.define('output-display', OutputDisplay);
