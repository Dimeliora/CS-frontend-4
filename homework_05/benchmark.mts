import { performance } from 'node:perf_hooks';
import { FlatArrayImgProcessor } from './solution_flat-array.mts';
import { TypedArrayImgProcessor } from './solution_typed-array.mts';
import { TuplesImgProcessor } from './solution_tuples.mts';
import { ObjectsImgProcessor } from './solution_objects.mts';

const RowMajor = 0;
const ColMajor = 1;

type RGBA = [number, number, number, number];

type AnyProcessor = {
    getPixel(x: number, y: number): RGBA;
    setPixel(x: number, y: number, rgba: RGBA): RGBA;
    forEach(mode: number, cb: (rgba: RGBA, x: number, y: number) => void): void;
};

type Ctor = new (w: number, h: number) => AnyProcessor;

const impls: Array<{ name: string; ctor: Ctor }> = [
    { name: 'TypedArray', ctor: TypedArrayImgProcessor as unknown as Ctor },
    { name: 'FlatArray',  ctor: FlatArrayImgProcessor  as unknown as Ctor },
    { name: 'Tuples',     ctor: TuplesImgProcessor     as unknown as Ctor },
    { name: 'Objects',    ctor: ObjectsImgProcessor    as unknown as Ctor },
];

const sizes = [
    { label: '64×64',     w: 64,   h: 64   },
    { label: '256×256',   w: 256,  h: 256  },
    { label: '512×512',   w: 512,  h: 512  },
    { label: '1024×1024', w: 1024, h: 1024 },
    { label: '2048×2048', w: 2048, h: 2048 },
];

const WARMUP = 3;
const RUNS   = 7;

function median(times: number[]): number {
    const s = [...times].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)]!;
}

function measure(fn: () => void): number {
    const times: number[] = [];
    for (let i = 0; i < RUNS; i++) {
        const t = performance.now();
        fn();
        times.push(performance.now() - t);
    }
    return median(times);
}

type BenchRow = {
    impl: string;
    size: string;
    pixels: number;
    construct: number;
    write: number;
    read: number;
    forEachRow: number;
    forEachCol: number;
};

const table: BenchRow[] = [];

for (const { label, w, h } of sizes) {
    process.stderr.write(`\n[${label}] `);

    for (const { name, ctor } of impls) {
        process.stderr.write(`${name} `);

        // Warmup JIT
        for (let i = 0; i < WARMUP; i++) {
            const img = new ctor(w, h);
            img.setPixel(0, 0, [1, 2, 3, 4]);
            img.getPixel(0, 0);
            img.forEach(RowMajor, () => {});
            img.forEach(ColMajor, () => {});
        }

        const constructMs = measure(() => { new ctor(w, h); });

        let writeImg!: AnyProcessor;
        const writeMs = measure(() => {
            writeImg = new ctor(w, h);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    writeImg.setPixel(x, y, [(x * y) % 256, x % 256, y % 256, 255]);
                }
            }
        });

        const readImg = writeImg;
        const readMs = measure(() => {
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    readImg.getPixel(x, y);
                }
            }
        });

        const rowImg = writeImg;
        const forEachRowMs = measure(() => { rowImg.forEach(RowMajor, () => {}); });

        const colImg = writeImg;
        const forEachColMs = measure(() => { colImg.forEach(ColMajor, () => {}); });

        table.push({
            impl: name,
            size: label,
            pixels: w * h,
            construct: constructMs,
            write:     writeMs,
            read:      readMs,
            forEachRow: forEachRowMs,
            forEachCol: forEachColMs,
        });
    }
}

process.stderr.write('\n');

// Output JSON for further processing
console.log(JSON.stringify(table, null, 2));
