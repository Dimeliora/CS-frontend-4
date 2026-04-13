/**
 * Бенчмарк: FreeShiftableArray vs Native Array
 * Операции (раздельно): push, pop, unshift, shift
 * Размеры данных: 1_000, 10_000, 100_000
 *
 * Режимы запуска:
 *   node benchmark.js --mode=jit-cold     # JIT без прогрева
 *   node benchmark.js --mode=jit-warm     # JIT с прогревом
 *   node --jitless benchmark.js --mode=jitless  # без JIT
 */

declare const process: { argv: string[] };

import { FreeShiftableArray } from './solution.js';

// ─── Конфигурация ────────────────────────────────────────────────────────────

const DATA_SIZES = [1_000, 10_000, 100_000];
const WARMUP_ITERATIONS = 5;
const WARMUP_SIZE = 1_000;
const BENCH_ITERATIONS = 20;

// ─── Типы ────────────────────────────────────────────────────────────────────

type MethodName = 'push' | 'pop' | 'unshift' | 'shift';
type CollectionType = 'native' | 'fsa';
type Mode = 'jit-cold' | 'jit-warm' | 'jitless';
type BenchFn = (size: number) => number;

interface BenchResult {
    operation: MethodName;
    structure: string;
    size: number;
    mode: Mode;
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

function structureLabel(type: CollectionType): string {
    return type === 'native' ? 'Native Array' : 'FreeShiftableArray';
}

// ─── Фабрика bench-функций ───────────────────────────────────────────────────

function createBenchFn(method: MethodName, type: CollectionType): BenchFn {
    const needsPrefill = method === 'pop' || method === 'shift';
    const isInsert = method === 'push' || method === 'unshift';

    if (type === 'native') {
        return (size: number): number => {
            const col: number[] = needsPrefill
                ? Array<number>(size).fill(0)
                : [];

            const start = performance.now();

            if (isInsert) {
                for (let i = 0; i < size; i += 1) col[method](0);
            } else {
                for (let i = 0; i < size; i += 1) col[method]();
            }

            return performance.now() - start;
        };
    }

    return (size: number): number => {
        const col = new FreeShiftableArray<number>();

        if (needsPrefill) {
            for (let i = 0; i < size; i += 1) col.push(0);
        }

        const start = performance.now();

        if (isInsert) {
            for (let i = 0; i < size; i += 1) col[method](0);
        } else {
            for (let i = 0; i < size; i += 1) col[method]();
        }

        return performance.now() - start;
    };
}

// ─── Прогрев JIT ────────────────────────────────────────────────────────────

function warmup(benchFn: BenchFn): void {
    for (let i = 0; i < WARMUP_ITERATIONS; i += 1) {
        benchFn(WARMUP_SIZE);
    }
}

// ─── Запуск одного бенчмарка ─────────────────────────────────────────────────

function runBench(
    method: MethodName,
    type: CollectionType,
    size: number,
    mode: Mode,
): BenchResult {
    const benchFn = createBenchFn(method, type);

    // Прогрев именно той функции, которая будет замеряться
    if (mode === 'jit-warm') {
        warmup(benchFn);
    }

    const times: number[] = [];

    for (let i = 0; i < BENCH_ITERATIONS; i += 1) {
        times.push(benchFn(size));
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const med = median(times);
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
        operation: method,
        structure: structureLabel(type),
        size,
        mode,
        avgMs: round3(avg),
        medianMs: round3(med),
        minMs: round3(min),
        maxMs: round3(max),
    };
}

// ─── Вывод результата ────────────────────────────────────────────────────────

function printResult(r: BenchResult): void {
    const pad = (s: string, len: number) => s.padEnd(len);
    console.log(
        `  ${pad(r.structure, 22)} | ${pad(r.operation, 10)} | ` +
        `avg: ${r.avgMs.toFixed(3).padStart(10)} ms | ` +
        `med: ${r.medianMs.toFixed(3).padStart(10)} ms | ` +
        `min: ${r.minMs.toFixed(3).padStart(10)} ms | ` +
        `max: ${r.maxMs.toFixed(3).padStart(10)} ms`,
    );
}

// ─── Сводная таблица ─────────────────────────────────────────────────────────

function printSummaryTable(results: BenchResult[]): void {
    const methods: MethodName[] = ['push', 'pop', 'unshift', 'shift'];
    const types: CollectionType[] = ['native', 'fsa'];

    console.log(`\n${'═'.repeat(78)}`);
    console.log('  Сводная таблица (median, ms)');
    console.log(`${'═'.repeat(78)}\n`);

    const header =
        '  ' +
        'Операция'.padEnd(30) +
        DATA_SIZES.map((s) => formatNum(s).padStart(12)).join('');
    console.log(header);
    console.log('  ' + '─'.repeat(72));

    for (const method of methods) {
        for (const type of types) {
            const label = `${method} [${structureLabel(type)}]`.padEnd(30);

            const values = DATA_SIZES.map((size) => {
                const r = results.find(
                    (x) =>
                        x.operation === method &&
                        x.structure === structureLabel(type) &&
                        x.size === size,
                );
                return r ? r.medianMs.toFixed(3).padStart(12) : 'N/A'.padStart(12);
            }).join('');

            console.log(`  ${label}${values}`);
        }
    }
}

// ─── Главная функция ─────────────────────────────────────────────────────────

function benchmark(): void {
    const modeArg = process.argv.find((a: string) => a.startsWith('--mode='));
    const mode = (modeArg ? modeArg.split('=')[1]! : 'jit-cold') as Mode;

    const methods: MethodName[] = ['push', 'pop', 'unshift', 'shift'];
    const types: CollectionType[] = ['native', 'fsa'];

    console.log(`═══════════════════════════════════════════════════`);
    console.log(`  Бенчмарк: FreeShiftableArray vs Native Array`);
    console.log(`  Режим: ${mode}`);
    console.log(`  Итерации: ${BENCH_ITERATIONS}`);
    console.log(`  Размеры: ${DATA_SIZES.map(formatNum).join(', ')}`);
    console.log(`═══════════════════════════════════════════════════\n`);

    const results: BenchResult[] = [];

    for (const size of DATA_SIZES) {
        console.log(`── Размер: ${formatNum(size)} ──────────────────────────────`);

        for (const method of methods) {
            for (const type of types) {
                const r = runBench(method, type, size, mode);
                results.push(r);
                printResult(r);
            }
        }

        console.log();
    }

    printSummaryTable(results);
}

benchmark();
