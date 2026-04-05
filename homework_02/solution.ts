class ExecutionTerminator extends Error {
    public returnCode: number;

    constructor(value: number) {
        super(String(value));

        this.returnCode = value;
    }
}

type OpsWithOperand = {
    /** Поместить операнд в аккумулятор */
    'SET A': 0;
    /** Выход из программы с возвратом значения операнда */
    'RET': 3;
    /** Перейти к инструкции под номером, указанным в операнде */
    'JMP': 5;
    /** Выполнить следующую команду, если содержимое аккумулятора равно операнду, иначе пропустить */
    'IFEQ A': 6;
    /** Увеличить значение в аккумуляторе на величину операнда */
    'ADD A': 8;
}

type OpsWithoutOperand = {
    /** Вывести содержимое аккумулятора */
    'PRINT A': 1;
    /** Выполнить следующую команду, если содержимое аккумулятора равно нулю, иначе пропустить */
    'IFN A': 2;
    /** Уменьшить содержимое аккумулятора на 1 */
    'DEC A': 4;
    /** Увеличить содержимое аккумулятора на 1 */
    'INC A': 7;
}

type Opcodes = OpsWithOperand & OpsWithoutOperand;

type Operand = number;

/* Для удобства декларативного описания программы */
const WITH_OPERAND_MAP = {
    'SET A': 0,
    'RET': 3,
    'JMP': 5,
    'IFEQ A': 6,
    "ADD A": 8,
} as const satisfies OpsWithOperand;

/* Для удобства декларативного описания программы */
const WITHOUT_OPERAND_MAP = {
    'PRINT A': 1,
    'IFN A': 2,
    'DEC A': 4,
    "INC A": 7,
} as const satisfies OpsWithoutOperand;

const OPCODES_MAP = {...WITH_OPERAND_MAP, ...WITHOUT_OPERAND_MAP};

class Operations {
    constructor(private executor: BytecodeExecutor) {}

    private static KNOWN_OPCODES = new Set<number>(Object.values(OPCODES_MAP));
    
    private static OPS_WITH_OPERAND = new Set<number>(Object.values(WITH_OPERAND_MAP));

    public isKnownOpcode(opcode: number | undefined): opcode is Opcodes[keyof Opcodes] {
        return opcode != null && Operations.KNOWN_OPCODES.has(opcode);
    }

    public isOpWithOperand(opcode: number | null): opcode is OpsWithOperand[keyof OpsWithOperand] {
        return opcode != null && Operations.OPS_WITH_OPERAND.has(opcode);
    }

    public getOperation(opcode: OpsWithOperand[keyof OpsWithOperand]): (operand: number) => void;
    public getOperation(opcode: OpsWithoutOperand[keyof OpsWithoutOperand]): () => void;
    public getOperation(opcode: number): (operand: number) => void {
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

    private setA(operand: Operand): void {
        this.executor._accumulator = operand;
    }

    private printA(): void {
        console.log(this.executor._accumulator);
    }

    private ifnA(): void {
        if (this.executor._accumulator !== 0) {
            /* Инкремент указателя исходя из типа команды впереди (с операндом или без) */
            this.executor._pointer += this.isOpWithOperand(this.executor._aheadOp) ? 2 : 1;
        }
    }

    private ret(operand: Operand): never {
        throw new ExecutionTerminator(operand);
    }

    private decA(): void {
        this.executor._accumulator -= 1;
    }

    private jmp(operand: Operand): void {
        this.executor._pointer = operand;
    }

    private incA(): void {
        this.executor._accumulator += 1;
    }

    private ifEqA(operand: Operand): void {
        if (this.executor._accumulator !== operand) {
            /* Инкремент указателя исходя из типа команды впереди (с операндом или без) */
            this.executor._pointer += this.isOpWithOperand(this.executor._aheadOp) ? 2 : 1;
        }
    }

    private addA(operand: Operand): void {
        this.executor._accumulator += operand;
    }
}

class BytecodeExecutor {
    _accumulator: number = 0;

    _pointer: number = 0;

    _aheadOp: Opcodes[keyof Opcodes] | null = null;
    
    _currentOp: Opcodes[keyof Opcodes] | null = null;

    private operations: Operations = new Operations(this);

    public execute(source: number[]) {
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

        } catch (cause) {            
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

const executor = new BytecodeExecutor();

/** исходная система команд */
/** кладём в аккумулятор 10, итеративно декрементируем, если 0 - завершаем */
const program_1 = [
    OPCODES_MAP['SET A'],
    10,
    OPCODES_MAP['PRINT A'],
    OPCODES_MAP['IFN A'],
    OPCODES_MAP['RET'],
    0,
    OPCODES_MAP['DEC A'],
    OPCODES_MAP['JMP'],
    2
];

console.log('program_1');
console.log(executor.execute(program_1));

/** слегка расширенная система команд */
/** кладём в аккумулятор 3, прибавляем 2, итеративно инкрементируем, пока не станет равным 7-и, завершаем */
const program_2 = [
    OPCODES_MAP['SET A'],
    3,
    OPCODES_MAP['PRINT A'],
    OPCODES_MAP['ADD A'],
    2,
    OPCODES_MAP['PRINT A'],
    OPCODES_MAP['IFEQ A'],
    7,
    OPCODES_MAP['RET'],
    0,
    OPCODES_MAP['INC A'],
    OPCODES_MAP['JMP'],
    5
];

console.log('program_2');
console.log(executor.execute(program_2));
