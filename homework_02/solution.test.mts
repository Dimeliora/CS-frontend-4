import assert from 'node:assert/strict';
import { BytecodeExecutor, ExecutionTerminator, Operations, OPCODES_MAP } from './solution.mjs';

// Хелпер: перехватывает console.log и собирает вывод
function captureOutput(fn: () => void): number[] {
    const output: number[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => output.push(Number(args[0]));

    try {
        fn();
    } finally {
        console.log = originalLog;
    }

    return output;
}

// === ExecutionTerminator ===

{
    const err = new ExecutionTerminator(42);
    assert.ok(err instanceof Error);
    assert.strictEqual(err.returnCode, 42);
    assert.strictEqual(err.message, '42');
}

console.log('✓ ExecutionTerminator');

// === OPCODES_MAP ===

{
    assert.strictEqual(OPCODES_MAP['SET A'], 0);
    assert.strictEqual(OPCODES_MAP['PRINT A'], 1);
    assert.strictEqual(OPCODES_MAP['IFN A'], 2);
    assert.strictEqual(OPCODES_MAP['RET'], 3);
    assert.strictEqual(OPCODES_MAP['DEC A'], 4);
    assert.strictEqual(OPCODES_MAP['JMP'], 5);
    assert.strictEqual(OPCODES_MAP['IFEQ A'], 6);
    assert.strictEqual(OPCODES_MAP['INC A'], 7);
    assert.strictEqual(OPCODES_MAP['ADD A'], 8);
}

console.log('✓ OPCODES_MAP');

// === Operations: isKnownOpcode ===

{
    const executor = new BytecodeExecutor();
    const ops = new Operations(executor);

    // Все известные опкоды
    for (const code of Object.values(OPCODES_MAP)) {
        assert.ok(ops.isKnownOpcode(code), `Опкод ${code} должен быть известен`);
    }

    // Неизвестные значения
    assert.strictEqual(ops.isKnownOpcode(99), false);
    assert.strictEqual(ops.isKnownOpcode(-1), false);
    assert.strictEqual(ops.isKnownOpcode(undefined), false);
}

console.log('✓ Operations.isKnownOpcode()');

// === Operations: isOpWithOperand ===

{
    const executor = new BytecodeExecutor();
    const ops = new Operations(executor);

    // С операндом: SET A (0), RET (3), JMP (5), IFEQ A (6), ADD A (8)
    assert.ok(ops.isOpWithOperand(0));
    assert.ok(ops.isOpWithOperand(3));
    assert.ok(ops.isOpWithOperand(5));
    assert.ok(ops.isOpWithOperand(6));
    assert.ok(ops.isOpWithOperand(8));

    // Без операнда: PRINT A (1), IFN A (2), DEC A (4), INC A (7)
    assert.strictEqual(ops.isOpWithOperand(1), false);
    assert.strictEqual(ops.isOpWithOperand(2), false);
    assert.strictEqual(ops.isOpWithOperand(4), false);
    assert.strictEqual(ops.isOpWithOperand(7), false);

    // null
    assert.strictEqual(ops.isOpWithOperand(null), false);
}

console.log('✓ Operations.isOpWithOperand()');

// === Простейшая программа: SET A + RET ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 42,
        OPCODES_MAP['RET'], 0,
    ];
    const result = executor.execute(program);
    assert.strictEqual(result, 0);
}

console.log('✓ SET A + RET');

// === RET возвращает указанный код ===

{
    const executor = new BytecodeExecutor();
    const result = executor.execute([
        OPCODES_MAP['RET'], 5,
    ]);
    assert.strictEqual(result, 5);
}

console.log('✓ RET возвращает код');

// === PRINT A выводит значение аккумулятора ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 99,
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['RET'], 0,
    ];

    const output = captureOutput(() => executor.execute(program));
    assert.deepStrictEqual(output, [99]);
}

console.log('✓ PRINT A');

// === DEC A уменьшает аккумулятор на 1 ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 5,
        OPCODES_MAP['DEC A'],
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['RET'], 0,
    ];

    const output = captureOutput(() => executor.execute(program));
    assert.deepStrictEqual(output, [4]);
}

console.log('✓ DEC A');

// === INC A увеличивает аккумулятор на 1 ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 10,
        OPCODES_MAP['INC A'],
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['RET'], 0,
    ];

    const output = captureOutput(() => executor.execute(program));
    assert.deepStrictEqual(output, [11]);
}

console.log('✓ INC A');

// === ADD A прибавляет операнд к аккумулятору ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 3,
        OPCODES_MAP['ADD A'], 7,
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['RET'], 0,
    ];

    const output = captureOutput(() => executor.execute(program));
    assert.deepStrictEqual(output, [10]);
}

console.log('✓ ADD A');

// === JMP переходит к указанной инструкции ===

{
    const executor = new BytecodeExecutor();
    // Программа: SET A 1, JMP 6, PRINT A (пропускается), RET 0
    // Индексы:   0     1  2   3  4        5              6   7
    const program = [
        OPCODES_MAP['SET A'], 1,    // 0, 1
        OPCODES_MAP['JMP'], 6,      // 2, 3
        OPCODES_MAP['PRINT A'],     // 4 — пропускается
        OPCODES_MAP['PRINT A'],     // 5 — пропускается
        OPCODES_MAP['RET'], 0,      // 6, 7
    ];

    const output = captureOutput(() => executor.execute(program));
    assert.deepStrictEqual(output, []);
}

console.log('✓ JMP');

// === IFN A: пропускает следующую команду, если A != 0 ===

{
    const executor = new BytecodeExecutor();
    // A = 5 (не ноль) → IFN A пропускает RET 0 → DEC A → ...
    // A = 0 → IFN A не пропускает → RET 0
    const program = [
        OPCODES_MAP['SET A'], 2,
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['IFN A'],
        OPCODES_MAP['RET'], 0,
        OPCODES_MAP['DEC A'],
        OPCODES_MAP['JMP'], 2,
    ];

    const output = captureOutput(() => {
        const result = executor.execute(program);
        assert.strictEqual(result, 0);
    });

    assert.deepStrictEqual(output, [2, 1, 0]);
}

console.log('✓ IFN A (цикл с обратным отсчётом)');

// === IFN A: A == 0 → не пропускает ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 0,
        OPCODES_MAP['IFN A'],
        OPCODES_MAP['RET'], 42,
        OPCODES_MAP['RET'], 0,
    ];

    const result = executor.execute(program);
    assert.strictEqual(result, 42);
}

console.log('✓ IFN A (A == 0, не пропускает)');

// === IFEQ A: пропускает следующую команду, если A != операнд ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 5,
        OPCODES_MAP['IFEQ A'], 5,   // A == 5 → не пропускаем
        OPCODES_MAP['RET'], 0,
    ];

    const result = executor.execute(program);
    assert.strictEqual(result, 0);
}

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 5,
        OPCODES_MAP['IFEQ A'], 3,   // A != 3 → пропускаем RET 99
        OPCODES_MAP['RET'], 99,
        OPCODES_MAP['RET'], 0,
    ];

    const result = executor.execute(program);
    assert.strictEqual(result, 0);
}

console.log('✓ IFEQ A');

// === IFEQ A: пропуск команды без операнда ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 10,
        OPCODES_MAP['IFEQ A'], 5,   // A != 5 → пропускаем PRINT A (без операнда, +1)
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['RET'], 0,
    ];

    const output = captureOutput(() => {
        const result = executor.execute(program);
        assert.strictEqual(result, 0);
    });

    assert.deepStrictEqual(output, []);
}

console.log('✓ IFEQ A (пропуск команды без операнда)');

// === IFN A: пропуск команды с операндом ===

{
    const executor = new BytecodeExecutor();
    // A = 5 (не ноль) → IFN A пропускает SET A 99 (команда с операндом, +2)
    const program = [
        OPCODES_MAP['SET A'], 5,
        OPCODES_MAP['IFN A'],
        OPCODES_MAP['SET A'], 99,   // пропускается (+2)
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['RET'], 0,
    ];

    const output = captureOutput(() => executor.execute(program));
    assert.deepStrictEqual(output, [5]);
}

console.log('✓ IFN A (пропуск команды с операндом)');

// === Программа из README: обратный отсчёт от 10 до 0 ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 10,
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['IFN A'],
        OPCODES_MAP['RET'], 0,
        OPCODES_MAP['DEC A'],
        OPCODES_MAP['JMP'], 2,
    ];

    const output = captureOutput(() => {
        const result = executor.execute(program);
        assert.strictEqual(result, 0);
    });

    assert.deepStrictEqual(output, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
}

console.log('✓ Программа из README (10 → 0)');

// === Неизвестный опкод → возвращает 1 ===

{
    const executor = new BytecodeExecutor();
    const result = executor.execute([99]);
    assert.strictEqual(result, 1);
}

console.log('✓ Неизвестный опкод → код возврата 1');

// === Пустая программа → возвращает 1 ===

{
    const executor = new BytecodeExecutor();
    const result = executor.execute([]);
    assert.strictEqual(result, 1);
}

console.log('✓ Пустая программа → код возврата 1');

// === Отсутствующий операнд → возвращает 1 ===

{
    const executor = new BytecodeExecutor();
    // SET A без операнда
    const result = executor.execute([OPCODES_MAP['SET A']]);
    assert.strictEqual(result, 1);
}

console.log('✓ Отсутствующий операнд → код возврата 1');

// === Повторное выполнение: состояние сбрасывается ===

{
    const executor = new BytecodeExecutor();

    executor.execute([
        OPCODES_MAP['SET A'], 100,
        OPCODES_MAP['RET'], 0,
    ]);

    // Второй запуск — аккумулятор должен быть сброшен
    const output = captureOutput(() => {
        executor.execute([
            OPCODES_MAP['PRINT A'],
            OPCODES_MAP['RET'], 0,
        ]);
    });

    assert.deepStrictEqual(output, [0]);
}

console.log('✓ Повторное выполнение (сброс состояния)');

// === Комбинация INC и DEC ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 0,
        OPCODES_MAP['INC A'],
        OPCODES_MAP['INC A'],
        OPCODES_MAP['INC A'],
        OPCODES_MAP['DEC A'],
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['RET'], 0,
    ];

    const output = captureOutput(() => executor.execute(program));
    assert.deepStrictEqual(output, [2]);
}

console.log('✓ Комбинация INC A и DEC A');

// === ADD A с отрицательным числом ===

{
    const executor = new BytecodeExecutor();
    const program = [
        OPCODES_MAP['SET A'], 10,
        OPCODES_MAP['ADD A'], -3,
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['RET'], 0,
    ];

    const output = captureOutput(() => executor.execute(program));
    assert.deepStrictEqual(output, [7]);
}

console.log('✓ ADD A с отрицательным операндом');

// === Сложная программа: сумма чисел от 1 до 5 ===
// Алгоритм: counter = 5, sum = 0; while (counter != 0) { sum += counter; counter--; } print sum; ret 0
// Используем два прохода: один для суммирования через ADD A

{
    const executor = new BytecodeExecutor();
    // Программа: считаем 5 + 4 + 3 + 2 + 1 = 15
    // Используем цикл: SET A 0, ADD A 1, ADD A 2, ADD A 3, ADD A 4, ADD A 5, PRINT A, RET 0
    const program = [
        OPCODES_MAP['SET A'], 0,
        OPCODES_MAP['ADD A'], 1,
        OPCODES_MAP['ADD A'], 2,
        OPCODES_MAP['ADD A'], 3,
        OPCODES_MAP['ADD A'], 4,
        OPCODES_MAP['ADD A'], 5,
        OPCODES_MAP['PRINT A'],
        OPCODES_MAP['RET'], 0,
    ];

    const output = captureOutput(() => {
        const result = executor.execute(program);
        assert.strictEqual(result, 0);
    });

    assert.deepStrictEqual(output, [15]);
}

console.log('✓ Сумма 1+2+3+4+5 = 15');

// === IFEQ A в цикле ===

{
    const executor = new BytecodeExecutor();
    // Считаем от 0 до 3: SET A 0, PRINT A, IFEQ A 3, JMP 10 (RET), INC A, JMP 2
    const program = [
        OPCODES_MAP['SET A'], 0,     // 0, 1
        OPCODES_MAP['PRINT A'],      // 2
        OPCODES_MAP['IFEQ A'], 3,    // 3, 4
        OPCODES_MAP['JMP'], 10,      // 5, 6 — если A == 3, переходим к RET
        OPCODES_MAP['INC A'],        // 7
        OPCODES_MAP['JMP'], 2,       // 8, 9 — обратно к PRINT A
        OPCODES_MAP['RET'], 0,       // 10, 11
    ];

    const output = captureOutput(() => {
        const result = executor.execute(program);
        assert.strictEqual(result, 0);
    });

    assert.deepStrictEqual(output, [0, 1, 2, 3]);
}

console.log('✓ IFEQ A в цикле (0 → 3)');

console.log('\n✅ Все тесты lect_02/hw_01 пройдены!');
