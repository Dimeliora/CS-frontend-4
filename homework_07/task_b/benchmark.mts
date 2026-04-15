/**
 * Бенчмарк: сравнение производительности произвольного доступа `at()`
 * 
 * hw_01 (StringsBuffer)   — последовательный формат, at() = O(n)
 * hw_02 (StringsBufferImp) — формат с указателями, at() = O(1)
 */

import { StringsBuffer } from '../hw_01/solution.mts';
import { StringsBufferImp } from './solution.mts';

// ─── Утилиты ────────────────────────────────────────────────────────

function randomString(len: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzАБВГДЕЖЗИКЛМНОП0123456789';
    let result = '';
    for (let i = 0; i < len; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

function generateStrings(count: number, avgLen: number = 20): string[] {
    return Array.from({ length: count }, () =>
        randomString(Math.max(1, Math.floor(avgLen * (0.5 + Math.random()))))
    );
}

interface BenchResult {
    name: string;
    size: number;
    totalOps: number;
    totalMs: number;
    opsPerSec: number;
    avgNs: number;
}

/**
 * Замеряет время выполнения `totalOps` вызовов `at()` по случайным индексам.
 */
function benchAt(
    name: string,
    buf: { at(i: number): string | undefined; size?: number },
    size: number,
    totalOps: number
): BenchResult {
    // Предгенерируем случайные индексы, чтобы не тратить время на Math.random в цикле
    const indices = new Int32Array(totalOps);
    for (let i = 0; i < totalOps; i++) {
        indices[i] = Math.floor(Math.random() * size);
    }

    // Прогрев
    for (let i = 0; i < Math.min(1000, totalOps); i++) {
        buf.at(indices[i]!);
    }

    const start = performance.now();
    for (let i = 0; i < totalOps; i++) {
        buf.at(indices[i]!);
    }
    const end = performance.now();

    const totalMs = end - start;
    const opsPerSec = (totalOps / totalMs) * 1000;
    const avgNs = (totalMs / totalOps) * 1_000_000;

    return { name, size, totalOps, totalMs, opsPerSec, avgNs };
}

// ─── Конфигурация ───────────────────────────────────────────────────

const SIZES = [100, 1_000, 5_000, 10_000];
const OPS = 10_000;

// ─── Запуск ─────────────────────────────────────────────────────────

console.log('='.repeat(80));
console.log('Бенчмарк: at() — произвольный доступ');
console.log('='.repeat(80));
console.log();

const allResults: BenchResult[] = [];

for (const size of SIZES) {
    const strings = generateStrings(size);

    const bufSeq = new StringsBuffer(strings);
    const bufPtr = new StringsBufferImp(strings);

    const ops = Math.min(OPS, size * 100); // для маленьких массивов не делаем слишком много

    console.log(`--- Размер массива: ${size.toLocaleString()} строк, ${ops.toLocaleString()} операций ---`);

    const resSeq = benchAt('hw_01 (sequential)', bufSeq, size, ops);
    const resPtr = benchAt('hw_02 (pointers)',   bufPtr, size, ops);

    const speedup = resSeq.totalMs / resPtr.totalMs;

    console.log(`  ${resSeq.name}: ${resSeq.totalMs.toFixed(2)} ms  (${resSeq.avgNs.toFixed(0)} ns/op)`);
    console.log(`  ${resPtr.name}: ${resPtr.totalMs.toFixed(2)} ms  (${resPtr.avgNs.toFixed(0)} ns/op)`);
    console.log(`  Ускорение hw_02 vs hw_01: ×${speedup.toFixed(2)}`);
    console.log();

    allResults.push(resSeq, resPtr);
}

// ─── Генерация Markdown-таблицы ─────────────────────────────────────

console.log('='.repeat(80));
console.log('Markdown-таблица (для BENCHMARK.md):');
console.log('='.repeat(80));
console.log();

const mdLines: string[] = [];

mdLines.push('## Результаты бенчмарка: `at()` — произвольный доступ');
mdLines.push('');
mdLines.push('| Размер массива | Реализация | Время (ms) | Среднее (ns/op) | ops/sec | Ускорение |');
mdLines.push('|:-:|:-:|:-:|:-:|:-:|:-:|');

for (let i = 0; i < allResults.length; i += 2) {
    const seq = allResults[i]!;
    const ptr = allResults[i + 1]!;
    const speedup = seq.totalMs / ptr.totalMs;

    mdLines.push(
        `| ${seq.size.toLocaleString()} | \`hw_01\` (sequential) | ${seq.totalMs.toFixed(2)} | ${seq.avgNs.toFixed(0)} | ${Math.round(seq.opsPerSec).toLocaleString()} | — |`
    );
    mdLines.push(
        `| ${ptr.size.toLocaleString()} | \`hw_02\` (pointers) | ${ptr.totalMs.toFixed(2)} | ${ptr.avgNs.toFixed(0)} | ${Math.round(ptr.opsPerSec).toLocaleString()} | **×${speedup.toFixed(2)}** |`
    );
}

console.log(mdLines.join('\n'));
