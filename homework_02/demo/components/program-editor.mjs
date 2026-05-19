import { OPCODES_MAP } from '../solution.mjs';

const OPCODE_BY_NAME = { ...OPCODES_MAP };
const NAME_BY_OPCODE = Object.fromEntries(
    Object.entries(OPCODE_BY_NAME).map(([k, v]) => [v, k])
);

const OPS_WITH_OPERAND = new Set([0, 3, 5, 6, 8]);

const template = document.createElement('template');
template.innerHTML = `
<style>
    :host {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--panel-bg, #1a1a28);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 12px;
        padding: 20px;
    }

    .panel-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
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

    .mode-toggle {
        display: flex;
        background: var(--input-bg, #10101a);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--border-color, #2a2a3a);
    }

    .mode-btn {
        padding: 5px 12px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        border: none;
        background: transparent;
        color: var(--text-muted, #6a6a7a);
        cursor: pointer;
        transition: all 0.2s;
    }

    .mode-btn.active {
        background: var(--accent-color, #7c6ff7);
        color: #fff;
    }

    .mode-btn:hover:not(.active) {
        color: var(--text-color, #e0e0e8);
    }

    textarea {
        width: 100%;
        flex: 1;
        min-height: 120px;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 8px;
        color: var(--text-color, #e0e0e8);
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        line-height: 1.6;
        padding: 12px 14px;
        resize: none;
        outline: none;
        transition: border-color 0.2s;
    }

    textarea:focus {
        border-color: var(--accent-color, #7c6ff7);
    }

    textarea::placeholder {
        color: var(--text-muted, #6a6a7a);
    }

    .actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
    }

    button {
        padding: 8px 16px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-run {
        background: var(--accent-color, #7c6ff7);
        color: #fff;
    }

    .btn-run:hover {
        background: var(--accent-hover, #6b5ce7);
        transform: translateY(-1px);
    }

    .btn-step {
        background: rgba(152, 195, 121, 0.15);
        color: var(--success-color, #98c379);
        border: 1px solid rgba(152, 195, 121, 0.3);
    }

    .btn-step:hover {
        background: rgba(152, 195, 121, 0.25);
        transform: translateY(-1px);
    }

    .btn-reset {
        background: rgba(224, 108, 117, 0.12);
        color: var(--error-color, #e06c75);
        border: 1px solid rgba(224, 108, 117, 0.25);
    }

    .btn-reset:hover {
        background: rgba(224, 108, 117, 0.22);
        transform: translateY(-1px);
    }

    .btn-example {
        background: rgba(124, 111, 247, 0.1);
        color: var(--accent-color, #7c6ff7);
        border: 1px solid rgba(124, 111, 247, 0.2);
        margin-left: auto;
    }

    .btn-example:hover {
        background: rgba(124, 111, 247, 0.2);
        transform: translateY(-1px);
    }

    .error-msg {
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(224, 108, 117, 0.1);
        border: 1px solid rgba(224, 108, 117, 0.25);
        border-radius: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--error-color, #e06c75);
        display: none;
    }

    .error-msg.visible {
        display: block;
    }
</style>

<div class="panel-header">
    <span class="panel-title"><span class="icon">📝</span> Программа</span>
    <div class="mode-toggle">
        <button class="mode-btn active" data-mode="mnemonic">Мнемокоды</button>
        <button class="mode-btn" data-mode="numeric">Числа</button>
    </div>
</div>

<textarea id="editor" spellcheck="false"></textarea>

<div class="error-msg" id="error"></div>

<div class="actions">
    <button class="btn-run" id="btn-run">▶ Выполнить</button>
    <button class="btn-step" id="btn-step">⏭ По шагам</button>
    <button class="btn-reset" id="btn-reset">⟲ Сброс</button>
    <button class="btn-example" id="btn-example">📋 Пример</button>
</div>
`;

const EXAMPLE_MNEMONIC = `SET A 10
PRINT A
IFN A
RET 0
DEC A
JMP 2`;

const EXAMPLE_NUMERIC = `0, 10, 1, 2, 3, 0, 4, 5, 2`;

export class ProgramEditor extends HTMLElement {
    #editor;
    #error;
    #mode = 'mnemonic';

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.#editor = this.shadowRoot.getElementById('editor');
        this.#error = this.shadowRoot.getElementById('error');
    }

    connectedCallback() {
        this.#editor.placeholder = this.#mode === 'mnemonic'
            ? 'SET A 10\nPRINT A\nIFN A\nRET 0\n...'
            : '0, 10, 1, 2, 3, 0, 4, 5, 2';

        // Переключение режимов
        this.shadowRoot.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newMode = btn.dataset.mode;
                if (newMode === this.#mode) return;

                // Попробуем конвертировать текущий текст
                const currentProgram = this.#tryParse();
                
                this.shadowRoot.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.#mode = newMode;

                if (currentProgram && this.#editor.value.trim()) {
                    this.#editor.value = this.#mode === 'mnemonic'
                        ? this.#numbersToMnemonic(currentProgram)
                        : currentProgram.join(', ');
                }

                this.#editor.placeholder = this.#mode === 'mnemonic'
                    ? 'SET A 10\nPRINT A\nIFN A\nRET 0\n...'
                    : '0, 10, 1, 2, 3, 0, 4, 5, 2';

                this.#hideError();
            });
        });

        // Кнопки
        this.shadowRoot.getElementById('btn-run').addEventListener('click', () => {
            const program = this.#tryParse();
            if (program) {
                this.#hideError();
                this.dispatchEvent(new CustomEvent('run-program', {
                    detail: { program },
                    bubbles: true, composed: true
                }));
            }
        });

        this.shadowRoot.getElementById('btn-step').addEventListener('click', () => {
            const program = this.#tryParse();
            if (program) {
                this.#hideError();
                this.dispatchEvent(new CustomEvent('step-program', {
                    detail: { program },
                    bubbles: true, composed: true
                }));
            }
        });

        this.shadowRoot.getElementById('btn-reset').addEventListener('click', () => {
            this.#hideError();
            this.dispatchEvent(new CustomEvent('reset-program', {
                bubbles: true, composed: true
            }));
        });

        this.shadowRoot.getElementById('btn-example').addEventListener('click', () => {
            this.#editor.value = this.#mode === 'mnemonic' ? EXAMPLE_MNEMONIC : EXAMPLE_NUMERIC;
            this.#hideError();
        });
    }

    /** Получить текущую программу как массив чисел */
    getProgram() {
        return this.#tryParse();
    }

    #tryParse() {
        const text = this.#editor.value.trim();
        if (!text) {
            this.#showError('Программа пуста');
            return null;
        }

        try {
            if (this.#mode === 'numeric') {
                return this.#parseNumeric(text);
            } else {
                return this.#parseMnemonic(text);
            }
        } catch (e) {
            this.#showError(e.message);
            return null;
        }
    }

    #parseNumeric(text) {
        const nums = text.split(/[\s,]+/).filter(s => s.length > 0);
        const result = [];
        for (const s of nums) {
            const n = Number(s);
            if (!Number.isFinite(n)) {
                throw new Error(`Некорректное число: "${s}"`);
            }
            result.push(n);
        }
        if (result.length === 0) throw new Error('Программа пуста');
        return result;
    }

    #parseMnemonic(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
        const result = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Попробуем найти мнемонику
            let matched = false;

            for (const [name, code] of Object.entries(OPCODE_BY_NAME)) {
                if (line.startsWith(name)) {
                    result.push(code);
                    const rest = line.slice(name.length).trim();

                    if (OPS_WITH_OPERAND.has(code)) {
                        if (rest === '') {
                            throw new Error(`Строка ${i + 1}: "${name}" требует операнд`);
                        }
                        const operand = Number(rest);
                        if (!Number.isFinite(operand)) {
                            throw new Error(`Строка ${i + 1}: некорректный операнд "${rest}"`);
                        }
                        result.push(operand);
                    } else if (rest !== '') {
                        throw new Error(`Строка ${i + 1}: "${name}" не принимает операнд`);
                    }

                    matched = true;
                    break;
                }
            }

            if (!matched) {
                throw new Error(`Строка ${i + 1}: неизвестная инструкция "${line}"`);
            }
        }

        return result;
    }

    #numbersToMnemonic(nums) {
        const lines = [];
        let i = 0;
        while (i < nums.length) {
            const code = nums[i];
            const name = NAME_BY_OPCODE[code];
            if (name) {
                if (OPS_WITH_OPERAND.has(code)) {
                    const operand = nums[i + 1] ?? 0;
                    lines.push(`${name} ${operand}`);
                    i += 2;
                } else {
                    lines.push(name);
                    i += 1;
                }
            } else {
                lines.push(`// ? ${code}`);
                i += 1;
            }
        }
        return lines.join('\n');
    }

    #showError(msg) {
        this.#error.textContent = '⚠ ' + msg;
        this.#error.classList.add('visible');
    }

    #hideError() {
        this.#error.classList.remove('visible');
    }
}

customElements.define('program-editor', ProgramEditor);
