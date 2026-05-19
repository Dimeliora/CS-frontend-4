export class ExecutionTerminator extends Error {
    returnCode;
    constructor(value) {
        super(String(value));
        this.returnCode = value;
    }
}
/* Для удобства декларативного описания программы */
const WITH_OPERAND_MAP = {
    'SET A': 0,
    'RET': 3,
    'JMP': 5,
    'IFEQ A': 6,
    "ADD A": 8,
};
/* Для удобства декларативного описания программы */
const WITHOUT_OPERAND_MAP = {
    'PRINT A': 1,
    'IFN A': 2,
    'DEC A': 4,
    "INC A": 7,
};
export const OPCODES_MAP = { ...WITH_OPERAND_MAP, ...WITHOUT_OPERAND_MAP };
export class Operations {
    executor;
    constructor(executor) {
        this.executor = executor;
    }
    static KNOWN_OPCODES = new Set(Object.values(OPCODES_MAP));
    static OPS_WITH_OPERAND = new Set(Object.values(WITH_OPERAND_MAP));
    isKnownOpcode(opcode) {
        return opcode != null && Operations.KNOWN_OPCODES.has(opcode);
    }
    isOpWithOperand(opcode) {
        return opcode != null && Operations.OPS_WITH_OPERAND.has(opcode);
    }
    getOperation(opcode) {
        switch (opcode) {
            case 0:
                return this.setA.bind(this);
            case 1:
                return this.printA.bind(this);
            case 2:
                return this.ifnA.bind(this);
            case 3:
                return this.ret.bind(this);
            case 4:
                return this.decA.bind(this);
            case 5:
                return this.jmp.bind(this);
            case 6:
                return this.ifEqA.bind(this);
            case 7:
                return this.incA.bind(this);
            case 8:
                return this.addA.bind(this);
            default:
                throw new ExecutionTerminator(1);
        }
    }
    setA(operand) {
        this.executor._accumulator = operand;
    }
    printA() {
        console.log(this.executor._accumulator);
    }
    ifnA() {
        if (this.executor._accumulator !== 0) {
            /* Инкремент указателя исходя из типа команды впереди (с операндом или без) */
            this.executor._pointer += this.isOpWithOperand(this.executor._aheadOp) ? 2 : 1;
        }
    }
    ret(operand) {
        throw new ExecutionTerminator(operand);
    }
    decA() {
        this.executor._accumulator -= 1;
    }
    jmp(operand) {
        this.executor._pointer = operand;
    }
    incA() {
        this.executor._accumulator += 1;
    }
    ifEqA(operand) {
        if (this.executor._accumulator !== operand) {
            /* Инкремент указателя исходя из типа команды впереди (с операндом или без) */
            this.executor._pointer += this.isOpWithOperand(this.executor._aheadOp) ? 2 : 1;
        }
    }
    addA(operand) {
        this.executor._accumulator += operand;
    }
}
export class BytecodeExecutor {
    _accumulator = 0;
    _pointer = 0;
    _aheadOp = null;
    _currentOp = null;
    operations = new Operations(this);
    execute(source) {
        try {
            while (true) {
                const next = source[this._pointer];
                /* нет команды в обработке, ожидаем, что `next` - команда */
                if (this._currentOp === null) {
                    if (!this.operations.isKnownOpcode(next)) {
                        /* неизвестная команда или неожиданный конец программы (не встретилась команда RET) */
                        throw new ExecutionTerminator(1);
                    }
                    this._currentOp = next;
                    this._pointer += 1;
                    continue;
                }
                /* текущая команда требует операнд, значит вызываем её, передавая `next` как операнд */
                if (this.operations.isOpWithOperand(this._currentOp)) {
                    /* неожиданный конец программы (отсутствует обязательный операнд) */
                    if (next == null) {
                        throw new ExecutionTerminator(1);
                    }
                    this._pointer += 1;
                    /* сохраняем потенциальную следующую команду для корректной обработки условных переходов */
                    const aheadValue = source[this._pointer];
                    this._aheadOp = this.operations.isKnownOpcode(aheadValue) ? aheadValue : null;
                    this.operations.getOperation(this._currentOp)(next);
                    this._currentOp = null;
                    continue;
                }
                /* текущая команда не требует операнда, значит вызываем её, обработку `next` передаём следующей итерации */
                /* сохраняем потенциальную следующую команду для корректной обработки условных переходов */
                this._aheadOp = this.operations.isKnownOpcode(next) ? next : null;
                this.operations.getOperation(this._currentOp)();
                this._currentOp = null;
            }
        }
        catch (cause) {
            if (cause instanceof ExecutionTerminator) {
                this._accumulator = 0;
                this._pointer = 0;
                this._aheadOp = null;
                this._currentOp = null;
                return cause.returnCode;
            }
            throw cause;
        }
    }
}
