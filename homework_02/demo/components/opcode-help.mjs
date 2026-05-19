const OPCODES_INFO = [
    { code: 0, name: 'SET A',   operand: true,  desc: 'Поместить операнд в аккумулятор A' },
    { code: 1, name: 'PRINT A', operand: false, desc: 'Вывести содержимое аккумулятора A' },
    { code: 2, name: 'IFN A',   operand: false, desc: 'Если A ≠ 0 — пропустить следующую инструкцию' },
    { code: 3, name: 'RET',     operand: true,  desc: 'Завершить программу с кодом возврата (операнд)' },
    { code: 4, name: 'DEC A',   operand: false, desc: 'Уменьшить A на 1' },
    { code: 5, name: 'JMP',     operand: true,  desc: 'Перейти к инструкции по адресу (операнд)' },
    { code: 6, name: 'IFEQ A',  operand: true,  desc: 'Если A ≠ операнд — пропустить следующую инструкцию' },
    { code: 7, name: 'INC A',   operand: false, desc: 'Увеличить A на 1' },
    { code: 8, name: 'ADD A',   operand: true,  desc: 'Прибавить операнд к A' },
];

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

    .help-table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
    }

    .help-table th {
        text-align: left;
        padding: 6px 10px;
        color: var(--text-muted, #6a6a7a);
        font-weight: 500;
        border-bottom: 1px solid var(--border-color, #2a2a3a);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .help-table td {
        padding: 6px 10px;
        border-bottom: 1px solid rgba(42, 42, 58, 0.5);
        vertical-align: top;
    }

    .help-table tr:last-child td {
        border-bottom: none;
    }

    .help-table tr:hover td {
        background: rgba(124, 111, 247, 0.04);
    }

    .opcode-num {
        color: #e5c07b;
        font-weight: 600;
        text-align: center;
    }

    .opcode-name {
        color: var(--accent-color, #7c6ff7);
        font-weight: 600;
        white-space: nowrap;
    }

    .opcode-operand {
        text-align: center;
    }

    .opcode-operand .yes {
        color: var(--success-color, #98c379);
    }

    .opcode-operand .no {
        color: var(--text-muted, #6a6a7a);
    }

    .opcode-desc {
        color: var(--text-color, #e0e0e8);
        font-size: 11px;
        line-height: 1.4;
    }

    .syntax-hint {
        margin-top: 14px;
        padding: 10px 14px;
        background: var(--input-bg, #10101a);
        border: 1px solid var(--border-color, #2a2a3a);
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--text-muted, #6a6a7a);
        line-height: 1.6;
    }

    .syntax-hint strong {
        color: var(--text-color, #e0e0e8);
        font-weight: 600;
    }

    .syntax-hint code {
        color: var(--accent-color, #7c6ff7);
        background: rgba(124, 111, 247, 0.08);
        padding: 1px 5px;
        border-radius: 3px;
    }

    .scroll-content {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
    }

    .scroll-content::-webkit-scrollbar {
        width: 6px;
    }

    .scroll-content::-webkit-scrollbar-track {
        background: transparent;
    }

    .scroll-content::-webkit-scrollbar-thumb {
        background: var(--border-color, #2a2a3a);
        border-radius: 3px;
    }
</style>

<div class="panel-header">
    <span class="panel-title"><span class="icon">📖</span> Справка по опкодам</span>
</div>

<div class="scroll-content">
    <table class="help-table">
        <thead>
            <tr>
                <th>Код</th>
                <th>Мнемоника</th>
                <th>Операнд</th>
                <th>Описание</th>
            </tr>
        </thead>
        <tbody id="tbody"></tbody>
    </table>

    <div class="syntax-hint">
        <strong>Синтаксис мнемокодов:</strong> одна инструкция на строку.<br>
        Пример: <code>SET A 10</code> — установить A = 10<br>
        <strong>Числовой формат:</strong> числа через запятую или пробел.<br>
        Пример: <code>0, 10, 1, 2, 3, 0</code>
    </div>
</div>
`;

export class OpcodeHelp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        const tbody = this.shadowRoot.getElementById('tbody');
        for (const op of OPCODES_INFO) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="opcode-num">${op.code}</td>
                <td class="opcode-name">${op.name}</td>
                <td class="opcode-operand">${op.operand
                    ? '<span class="yes">✓</span>'
                    : '<span class="no">—</span>'}</td>
                <td class="opcode-desc">${op.desc}</td>
            `;
            tbody.appendChild(tr);
        }
    }
}

customElements.define('opcode-help', OpcodeHelp);
