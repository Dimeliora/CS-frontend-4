import { BytecodeExecutor, OPCODES_MAP } from '../solution.mjs';

const NAME_BY_OPCODE = Object.fromEntries(
    Object.entries(OPCODES_MAP).map(([k, v]) => [v, k])
);
const OPS_WITH_OPERAND = new Set([0, 3, 5, 6, 8]);

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
        gap: 10px;
    }

    .badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .badge-acc {
        background: rgba(124, 111, 247, 0.12);
        color: var(--accent-color, #7c6ff7);
        border: 1px solid rgba(124, 111, 247, 0.25);
    }

    .badge-ptr {
        background: rgba(229, 192, 123, 0.12);
        color: #e5c07b;
        border: 1px solid rgba(229, 192, 123, 0.25);
    }

    .badge-step {
        background: rgba(86, 182, 194, 0.12);
        color: #56b6c2;
        border: 1px solid rgba(86, 182, 194, 0.25);
    }

    .program-view {
        width: 100%;
        flex: 1;
        min-height: 80px;
        overflow-y: auto;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 8px;
        padding: 8px 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        line-height: 1.5;
    }

    .program-view::-webkit-scrollbar {
        width: 6px;
    }

    .program-view::-webkit-scrollbar-track {
        background: transparent;
    }

    .program-view::-webkit-scrollbar-thumb {
        background: var(--border-color, #2a2a3a);
        border-radius: 3px;
    }

    .instr-row {
        display: flex;
        align-items: center;
        padding: 3px 12px;
        transition: background 0.2s, border-color 0.2s;
        border-left: 3px solid transparent;
    }

    .instr-row.active {
        background: rgba(124, 111, 247, 0.12);
        border-left-color: var(--accent-color, #7c6ff7);
    }

    .instr-row.executed {
        background: rgba(152, 195, 121, 0.05);
    }

    .instr-addr {
        width: 32px;
        color: var(--text-muted, #6a6a7a);
        font-size: 10px;
        flex-shrink: 0;
    }

    .instr-code {
        width: 28px;
        color: #e5c07b;
        flex-shrink: 0;
        text-align: center;
    }

    .instr-name {
        color: var(--accent-color, #7c6ff7);
        font-weight: 600;
        margin-left: 8px;
    }

    .instr-operand {
        color: var(--success-color, #98c379);
        margin-left: 6px;
    }

    .instr-pointer {
        margin-left: auto;
        font-size: 12px;
    }

    .controls {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        align-items: center;
    }

    button {
        padding: 7px 14px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none !important;
    }

    .btn-next {
        background: rgba(152, 195, 121, 0.15);
        color: var(--success-color, #98c379);
        border: 1px solid rgba(152, 195, 121, 0.3);
    }

    .btn-next:hover:not(:disabled) {
        background: rgba(152, 195, 121, 0.25);
        transform: translateY(-1px);
    }

    .btn-auto {
        background: rgba(86, 182, 194, 0.12);
        color: #56b6c2;
        border: 1px solid rgba(86, 182, 194, 0.25);
    }

    .btn-auto:hover:not(:disabled) {
        background: rgba(86, 182, 194, 0.22);
        transform: translateY(-1px);
    }

    .speed-control {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--text-muted, #6a6a7a);
    }

    .speed-control input[type="range"] {
        width: 80px;
        accent-color: var(--accent-color, #7c6ff7);
    }

    .empty-state {
        color: var(--text-muted, #6a6a7a);
        font-size: 12px;
        text-align: center;
        padding: 40px 14px;
        font-family: 'JetBrains Mono', monospace;
    }

    .empty-state .big-icon {
        font-size: 28px;
        display: block;
        margin-bottom: 8px;
    }
</style>

<div class="panel-header">
    <span class="panel-title"><span class="icon">🔍</span> Трассировка</span>
    <div class="state-badges">
        <span class="badge badge-acc">A = <span id="acc-val">—</span></span>
        <span class="badge badge-ptr">ptr = <span id="ptr-val">—</span></span>
        <span class="badge badge-step">шаг <span id="step-val">—</span></span>
    </div>
</div>

<div class="program-view" id="program-view">
    <div class="empty-state">
        <span class="big-icon">🐛</span>
        Нажмите «По шагам» для запуска трассировки
    </div>
</div>

<div class="controls">
    <button class="btn-next" id="btn-next" disabled>⏭ Шаг</button>
    <button class="btn-auto" id="btn-auto" disabled>▶ Авто</button>
    <div class="speed-control">
        <span>🐢</span>
        <input type="range" id="speed" min="50" max="1000" value="400" step="50">
        <span>🐇</span>
    </div>
</div>
`;

/**
 * Компонент визуализации трассировки выполнения.
 * 
 * Использует оригинальный BytecodeExecutor из solution.mjs напрямую.
 * Перед запуском execute() оборачивает source в Proxy, который на каждое
 * чтение элемента записывает снимок состояния executor'а (pointer, accumulator).
 * После завершения execute() трассировка воспроизводится пошагово.
 */
export class ExecutionViewer extends HTMLElement {
    #programView;
    #accVal;
    #ptrVal;
    #stepVal;
    #btnNext;
    #btnAuto;
    #speedInput;

    #trace = [];        // массив снимков { pointer, accumulator, currentOp }
    #currentStep = -1;
    #source = null;
    #autoTimer = null;
    #onPrint = null;
    #printLog = [];     // { stepIndex, value }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.#programView = this.shadowRoot.getElementById('program-view');
        this.#accVal = this.shadowRoot.getElementById('acc-val');
        this.#ptrVal = this.shadowRoot.getElementById('ptr-val');
        this.#stepVal = this.shadowRoot.getElementById('step-val');
        this.#btnNext = this.shadowRoot.getElementById('btn-next');
        this.#btnAuto = this.shadowRoot.getElementById('btn-auto');
        this.#speedInput = this.shadowRoot.getElementById('speed');
    }

    connectedCallback() {
        this.#btnNext.addEventListener('click', () => this.#nextStep());
        this.#btnAuto.addEventListener('click', () => this.#toggleAuto());
    }

    /**
     * Запустить трассировку: выполнить программу через оригинальный BytecodeExecutor,
     * собрать снимки состояния по логическим инструкциям, затем позволить
     * пользователю просматривать их пошагово.
     *
     * Снимок записывается только в момент начала новой инструкции
     * (когда executor._currentOp === null и читается опкод).
     * PRINT-ы привязываются к инструкции, которая их вызвала.
     *
     * @param {number[]} source — программа
     * @param {number} maxSteps — лимит шагов (защита от зацикливания)
     * @param {{ onPrint?: (v: number) => void, onFinish?: (code: number, err?: string) => void }} callbacks
     * @returns {{ returnCode: number, prints: number[] }}
     */
    run(source, maxSteps, callbacks = {}) {
        this.#stopAuto();
        this.#source = [...source];
        this.#trace = [];
        this.#currentStep = -1;
        this.#printLog = [];
        this.#onPrint = callbacks.onPrint || null;

        const executor = new BytecodeExecutor();
        const trace = this.#trace;
        const printLog = this.#printLog;
        let accessCount = 0;

        // Перехватываем console.log для PRINT A
        const originalLog = console.log;
        console.log = (...args) => {
            // Привязываем к текущей (последней записанной) инструкции
            printLog.push({ stepIndex: trace.length - 1, value: args.join(' ') });
        };

        // Proxy для записи трассировки.
        // Снимок создаётся только когда executor._currentOp === null,
        // т.е. в начале каждой новой логической инструкции.
        const proxySource = new Proxy(source, {
            get(target, prop, receiver) {
                if (typeof prop === 'string' && !isNaN(Number(prop))) {
                    accessCount++;
                    if (accessCount > maxSteps) {
                        throw new Error(`TIMEOUT: превышен лимит в ${maxSteps} обращений`);
                    }

                    // Записываем снимок только при чтении нового опкода
                    // (executor._currentOp === null означает, что сейчас читается опкод)
                    if (executor._currentOp === null) {
                        trace.push({
                            pointer: executor._pointer,
                            accumulator: executor._accumulator,
                            readIndex: Number(prop),
                        });
                    }
                }
                return Reflect.get(target, prop, receiver);
            }
        });

        let returnCode;
        let errorMsg;

        try {
            returnCode = executor.execute(proxySource);
        } catch (err) {
            console.log = originalLog;
            errorMsg = err.message;
            returnCode = -1;
        }

        console.log = originalLog;

        // Финальный снимок
        trace.push({
            pointer: executor._pointer,
            accumulator: executor._accumulator,
            readIndex: -1,
            final: true,
            returnCode,
            errorMsg,
        });

        this.#renderProgram();
        this.#updateBadges(0, '—', `0 / ${trace.length - 1}`);

        this.#btnNext.disabled = false;
        this.#btnAuto.disabled = false;

        if (callbacks.onFinish) {
            this._onFinish = () => callbacks.onFinish(returnCode, errorMsg);
        }

        return { returnCode, prints: printLog.map(p => p.value) };
    }

    reset() {
        this.#stopAuto();
        this.#trace = [];
        this.#currentStep = -1;
        this.#source = null;
        this.#printLog = [];
        this.#btnNext.disabled = true;
        this.#btnAuto.disabled = true;
        this.#programView.innerHTML = `
            <div class="empty-state">
                <span class="big-icon">🐛</span>
                Нажмите «По шагам» для запуска трассировки
            </div>`;
        this.#updateBadges('—', '—', '—');
    }

    #nextStep() {
        if (this.#currentStep >= this.#trace.length - 1) {
            this.#stopAuto();
            this.#btnNext.disabled = true;
            this.#btnAuto.disabled = true;
            return false;
        }

        this.#currentStep++;
        const snap = this.#trace[this.#currentStep];

        // Показать PRINT-ы, привязанные к этой инструкции
        for (const p of this.#printLog) {
            if (p.stepIndex === this.#currentStep && this.#onPrint) {
                this.#onPrint(p.value);
            }
        }

        if (snap.final) {
            this.#updateBadges(
                snap.accumulator,
                snap.pointer,
                `✓ ${this.#trace.length - 1}`
            );
            this.#highlightRow(-1); // снять подсветку
            this.#btnNext.disabled = true;
            this.#btnAuto.disabled = true;
            this.#stopAuto();
            if (this._onFinish) this._onFinish();
            return false;
        }

        this.#updateBadges(
            snap.accumulator,
            snap.pointer,
            `${this.#currentStep + 1} / ${this.#trace.length - 1}`
        );
        this.#highlightRow(snap.readIndex);

        return true;
    }

    #toggleAuto() {
        if (this.#autoTimer) {
            this.#stopAuto();
            return;
        }

        const delay = 1050 - Number(this.#speedInput.value);
        this.#btnAuto.textContent = '⏸ Пауза';

        this.#autoTimer = setInterval(() => {
            if (!this.#nextStep()) {
                this.#stopAuto();
            }
        }, delay);
    }

    #stopAuto() {
        if (this.#autoTimer) {
            clearInterval(this.#autoTimer);
            this.#autoTimer = null;
        }
        this.#btnAuto.textContent = '▶ Авто';
    }

    #renderProgram() {
        if (!this.#source) return;
        this.#programView.innerHTML = '';

        const source = this.#source;
        let i = 0;

        while (i < source.length) {
            const val = source[i];
            const name = NAME_BY_OPCODE[val];

            if (name && OPS_WITH_OPERAND.has(val)) {
                const operand = source[i + 1];
                this.#programView.appendChild(this.#createRow(i, val, name, operand));
                i += 2;
            } else if (name) {
                this.#programView.appendChild(this.#createRow(i, val, name, null));
                i += 1;
            } else {
                this.#programView.appendChild(this.#createRow(i, val, `(${val})`, null));
                i += 1;
            }
        }
    }

    #createRow(addr, code, name, operand) {
        const row = document.createElement('div');
        row.className = 'instr-row';
        row.dataset.addr = String(addr);

        row.innerHTML = `
            <span class="instr-addr">${String(addr).padStart(2, '0')}</span>
            <span class="instr-code">${code}</span>
            <span class="instr-name">${name}</span>
            ${operand != null ? `<span class="instr-operand">${operand}</span>` : ''}
            <span class="instr-pointer"></span>
        `;

        return row;
    }

    #highlightRow(readIndex) {
        const rows = this.#programView.querySelectorAll('.instr-row');
        rows.forEach(row => {
            const addr = Number(row.dataset.addr);
            row.classList.remove('active');

            // Найти строку, содержащую readIndex
            if (addr === readIndex || (addr < readIndex && this.#getRowEndAddr(row) > readIndex)) {
                row.classList.add('active');
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        });
    }

    #getRowEndAddr(row) {
        const addr = Number(row.dataset.addr);
        const operandEl = row.querySelector('.instr-operand');
        return operandEl ? addr + 2 : addr + 1;
    }

    #updateBadges(acc, ptr, step) {
        this.#accVal.textContent = String(acc);
        this.#ptrVal.textContent = String(ptr);
        this.#stepVal.textContent = String(step);
    }
}

customElements.define('execution-viewer', ExecutionViewer);
