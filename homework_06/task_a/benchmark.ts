/**
 * Бенчмарк: Производительность операций вставки/удаления элементов массива
 * Операции: push, pop, unshift, shift
 * Размеры начальных массивов: 100, 1_000, 10_000, 100_000
 * Количество операций в каждом замере: 100_000
 * Режимы массивов: packed (плотный) и holey (с дырками)
 *
 * Запуск:
 *   npx tsx benchmark.ts              # с прогревом JIT (по умолчанию)
 *   npx tsx benchmark.ts --no-warmup  # без прогрева JIT
 */

// ─── Разбор аргументов ───────────────────────────────────────────────────────

declare const process: { argv: string[] };

const args = typeof process !== 'undefined' ? process.argv.slice(2) : [];
const NO_WARMUP = args.includes('--no-warmup');

// ─── Конфигурация ────────────────────────────────────────────────────────────

const DATA_SIZES = [100, 1_000, 10_000, 100_000];
const OPS_COUNT = 100_000;
const WARMUP_RUNS = 3;
const BENCH_ITERATIONS = 5;

// ─── Типы ────────────────────────────────────────────────────────────────────

type MethodName = 'push' | 'pop' | 'unshift' | 'shift';

interface BenchResult {
    operation: MethodName;
    size: number;
    holey: boolean;
    avgMs: number;
    medianMs: number;
    minMs: number;
    maxMs: number;
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]!
        : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function formatNum(n: number): string {
    return n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(0)}M`
        : n >= 1_000
          ? `${(n / 1_000).toFixed(0)}K`
          : String(n);
}

function round3(n: number): number {
    return Math.round(n * 1000) / 1000;
}

// ─── Создание массивов ───────────────────────────────────────────────────────

function createPackedArray(size: number): number[] {
    const array: number[] = [];

    for (let i = 0; i < size; i += 1) {
        array.push(i);
    }

    return array;
}

function createHoleyArray(size: number): number[] {
    const array = new Array<number>(size);

    for (let i = 0; i < size; i += 2) {
        array[i] = i;
    }

    return array;
}

function createArray(size: number, isHoley: boolean): number[] {
    return isHoley ? createHoleyArray(size) : createPackedArray(size);
}

// ─── Функции замера отдельных операций ───────────────────────────────────────

function benchPush(size: number, isHoley: boolean): number {
    const arr = createArray(size, isHoley);

    const start = performance.now();

    for (let i = 0; i < OPS_COUNT; i += 1) {
        arr.push(i);
    }

    return performance.now() - start;
}

function benchPop(size: number, isHoley: boolean): number {
    const arr = createArray(size, isHoley);

    // Гарантируем достаточное количество элементов для удаления
    const needed = size + OPS_COUNT;

    for (let i = arr.length; i < needed; i += 1) {
        arr.push(i);
    }

    const start = performance.now();

    for (let i = 0; i < OPS_COUNT; i += 1) {
        arr.pop();
    }

    return performance.now() - start;
}

function benchUnshift(size: number, isHoley: boolean): number {
    const arr = createArray(size, isHoley);

    const start = performance.now();

    for (let i = 0; i < OPS_COUNT; i += 1) {
        arr.unshift(i);
    }

    return performance.now() - start;
}

function benchShift(size: number, isHoley: boolean): number {
    const arr = createArray(size, isHoley);

    // Гарантируем достаточное количество элементов для удаления
    const needed = size + OPS_COUNT;

    for (let i = arr.length; i < needed; i += 1) {
        arr.push(i);
    }

    const start = performance.now();

    for (let i = 0; i < OPS_COUNT; i += 1) {
        arr.shift();
    }

    return performance.now() - start;
}

// ─── Маппинг метод → функция замера ─────────────────────────────────────────

type BenchFn = (size: number, isHoley: boolean) => number;

const BENCH_FNS: Record<MethodName, BenchFn> = {
    push: benchPush,
    pop: benchPop,
    unshift: benchUnshift,
    shift: benchShift,
};

// ─── Прогрев JIT ────────────────────────────────────────────────────────────

function warmup(benchFn: BenchFn, isHoley: boolean): void {
    for (let i = 0; i < WARMUP_RUNS; i += 1) {
        benchFn(100, isHoley);
    }
}

// ─── Запуск одного бенчмарка ─────────────────────────────────────────────────

function runBench(
    method: MethodName,
    size: number,
    isHoley: boolean,
): BenchResult {
    const benchFn = BENCH_FNS[method];

    // Прогрев именно той функции, которая будет замеряться
    if (!NO_WARMUP) {
        warmup(benchFn, isHoley);
    }

    // Замер
    const times: number[] = [];

    for (let i = 0; i < BENCH_ITERATIONS; i += 1) {
        times.push(benchFn(size, isHoley));
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const med = median(times);
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
        operation: method,
        size,
        holey: isHoley,
        avgMs: round3(avg),
        medianMs: round3(med),
        minMs: round3(min),
        maxMs: round3(max),
    };
}

// ─── Вывод результатов ───────────────────────────────────────────────────────

function printResult(r: BenchResult): void {
    const tag = r.holey ? 'holey ' : 'packed';
    const op = r.operation.padEnd(7);

    console.log(
        `  ${op} [${tag}] | ` +
        `avg: ${r.avgMs.toFixed(3).padStart(10)} ms | ` +
        `med: ${r.medianMs.toFixed(3).padStart(10)} ms | ` +
        `min: ${r.minMs.toFixed(3).padStart(10)} ms | ` +
        `max: ${r.maxMs.toFixed(3).padStart(10)} ms`,
    );
}

function printSummaryTable(results: BenchResult[]): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Сводная таблица (median, ms)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const methods: MethodName[] = ['push', 'pop', 'unshift', 'shift'];
    const modes = [false, true] as const;

    // Заголовок
    const header =
        '  ' +
        'Операция'.padEnd(20) +
        DATA_SIZES.map((s) => formatNum(s).padStart(12)).join('');
    console.log(header);
    console.log('  ' + '─'.repeat(68));

    for (const method of methods) {
        for (const isHoley of modes) {
            const tag = isHoley ? 'holey ' : 'packed';
            const label = `${method} [${tag}]`.padEnd(20);

            const values = DATA_SIZES.map((size) => {
                const r = results.find(
                    (x) => x.operation === method && x.size === size && x.holey === isHoley,
                );
                return r ? r.medianMs.toFixed(3).padStart(12) : 'N/A'.padStart(12);
            }).join('');

            console.log(`  ${label}${values}`);
        }
    }
}

// ─── Главная функция ─────────────────────────────────────────────────────────

function benchmark(): void {
    const methods: MethodName[] = ['push', 'pop', 'unshift', 'shift'];
    const warmupLabel = NO_WARMUP ? 'ВЫКЛ ❄️' : `${WARMUP_RUNS} запусков 🔥`;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Бенчмарк: push/pop vs unshift/shift (packed vs holey)');
    console.log(`  Операций за замер: ${formatNum(OPS_COUNT)}`);
    console.log(`  Итераций замера: ${BENCH_ITERATIONS}`);
    console.log(`  Прогрев JIT: ${warmupLabel}`);
    console.log(`  Размеры массивов: ${DATA_SIZES.map(formatNum).join(', ')}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const results: BenchResult[] = [];

    for (const size of DATA_SIZES) {
        console.log(`── Размер: ${formatNum(size)} ${'─'.repeat(50)}`);

        for (const method of methods) {
            for (const isHoley of [false, true]) {
                const r = runBench(method, size, isHoley);
                results.push(r);
                printResult(r);
            }
        }

        console.log();
    }

    printSummaryTable(results);
}

benchmark();
