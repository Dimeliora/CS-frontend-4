import assert from 'node:assert/strict';
import { Memory } from './solution.mts';

// ============================================
//  Утилиты
// ============================================

function makeBuffer(...bytes: number[]): ArrayBuffer {
    return new Uint8Array(bytes).buffer;
}

function toBytes(ab: ArrayBuffer): number[] {
    return [...new Uint8Array(ab)];
}

// ============================================
//  alloc: базовые операции
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(10);
    assert.strictEqual(ptr.deref().byteLength, 10);
    ptr.free();
    console.log('✓ куча: alloc возвращает указатель с корректным byteLength');
}

{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(4);
    ptr.change(makeBuffer(1, 2, 3, 4));
    assert.deepStrictEqual(toBytes(ptr.deref()), [1, 2, 3, 4]);
    ptr.free();
    console.log('✓ куча: change + deref');
}

// alloc(0) — нулевой размер
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(0);
    assert.strictEqual(ptr.deref().byteLength, 0);
    ptr.free();
    console.log('✓ куча: alloc(0) — нулевой размер');
}

// Несколько alloc(0) подряд
{
    const mem = new Memory(1024, { stack: 256 });
    const p1 = mem.alloc(0);
    const p2 = mem.alloc(0);
    const p3 = mem.alloc(0);
    assert.strictEqual(p1.deref().byteLength, 0);
    assert.strictEqual(p2.deref().byteLength, 0);
    assert.strictEqual(p3.deref().byteLength, 0);
    p1.free();
    p2.free();
    p3.free();
    console.log('✓ куча: несколько alloc(0) подряд');
}

// ============================================
//  deref: возвращает копию
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(4);
    ptr.change(makeBuffer(1, 2, 3, 4));

    const ref1 = ptr.deref();
    const ref2 = ptr.deref();
    assert.notStrictEqual(ref1, ref2);
    assert.deepStrictEqual(toBytes(ref1), toBytes(ref2));
    ptr.free();
    console.log('✓ куча: deref возвращает копию (разные объекты)');
}

// ============================================
//  change: краевые случаи
// ============================================

// change с меньшим буфером — остаток обнуляется
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(4);
    ptr.change(makeBuffer(1, 2));
    assert.deepStrictEqual(toBytes(ptr.deref()), [1, 2, 0, 0]);
    ptr.free();
    console.log('✓ куча: change с меньшим буфером обнуляет остаток');
}

// change с пустым буфером — все обнуляются
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(3);
    ptr.change(makeBuffer(1, 2, 3));
    ptr.change(makeBuffer());
    assert.deepStrictEqual(toBytes(ptr.deref()), [0, 0, 0]);
    ptr.free();
    console.log('✓ куча: change с пустым буфером обнуляет данные');
}

// change с точным размером capacity
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(5);
    ptr.change(makeBuffer(10, 20, 30, 40, 50));
    assert.deepStrictEqual(toBytes(ptr.deref()), [10, 20, 30, 40, 50]);
    ptr.free();
    console.log('✓ куча: change с точным размером capacity');
}

// change с превышением capacity → ошибка
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(2);
    assert.throws(
        () => ptr.change(makeBuffer(1, 2, 3)),
        { message: /Passed data does not fit into the capacity of the allocated memory/ },
    );
    ptr.free();
    console.log('✓ куча: change с превышением capacity → ошибка');
}

// Сообщение об ошибке содержит размеры
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(5);
    assert.throws(
        () => ptr.change(makeBuffer(1, 2, 3, 4, 5, 6, 7, 8)),
        (err: Error) => {
            assert.ok(err.message.includes('8'));  // Passed
            assert.ok(err.message.includes('5'));  // capacity
            return true;
        },
    );
    ptr.free();
    console.log('✓ куча: сообщение об ошибке change содержит размеры');
}

// Многократный change одного указателя
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(4);

    for (let i = 0; i < 10; i++) {
        ptr.change(makeBuffer(i, i + 1, i + 2, i + 3));
        assert.deepStrictEqual(toBytes(ptr.deref()), [i, i + 1, i + 2, i + 3]);
    }
    ptr.free();
    console.log('✓ куча: многократный change одного указателя');
}

// change не затрагивает соседние аллокации
{
    const mem = new Memory(1024, { stack: 256 });
    const p1 = mem.alloc(4);
    const p2 = mem.alloc(4);

    p1.change(makeBuffer(0xAA, 0xBB, 0xCC, 0xDD));
    p2.change(makeBuffer(0x11, 0x22, 0x33, 0x44));

    p1.change(makeBuffer(0xFF, 0xFF, 0xFF, 0xFF));

    assert.deepStrictEqual(toBytes(p1.deref()), [0xFF, 0xFF, 0xFF, 0xFF]);
    assert.deepStrictEqual(toBytes(p2.deref()), [0x11, 0x22, 0x33, 0x44]);
    p1.free();
    p2.free();
    console.log('✓ куча: change не затрагивает соседние аллокации');
}

// ============================================
//  free и double free
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(10);
    ptr.free();

    assert.throws(
        () => ptr.free(),
        { message: 'Allocated memory is already freed' },
    );
    console.log('✓ куча: double free → ошибка');
}

// deref после free → ошибка
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(10);
    ptr.free();

    assert.throws(
        () => ptr.deref(),
        { message: 'Allocated memory is already freed' },
    );
    console.log('✓ куча: deref после free → ошибка');
}

// change после free → ошибка
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.alloc(10);
    ptr.free();

    assert.throws(
        () => ptr.change(makeBuffer(1)),
        { message: 'Allocated memory is already freed' },
    );
    console.log('✓ куча: change после free → ошибка');
}

// free одного указателя не влияет на другие
{
    const mem = new Memory(1024, { stack: 256 });
    const p1 = mem.alloc(10);
    const p2 = mem.alloc(10);
    const p3 = mem.alloc(10);

    p1.change(makeBuffer(...Array.from({ length: 10 }, () => 0x11)));
    p2.change(makeBuffer(...Array.from({ length: 10 }, () => 0x22)));
    p3.change(makeBuffer(...Array.from({ length: 10 }, () => 0x33)));

    p2.free();

    assert.deepStrictEqual(toBytes(p1.deref()), Array.from({ length: 10 }, () => 0x11));
    assert.deepStrictEqual(toBytes(p3.deref()), Array.from({ length: 10 }, () => 0x33));
    assert.throws(() => p2.deref(), { message: 'Allocated memory is already freed' });

    p1.free();
    p3.free();
    console.log('✓ куча: free одного указателя не влияет на другие');
}

// ============================================
//  Переполнение кучи
// ============================================

// Пустая куча — alloc больше heapCapacity
{
    const mem = new Memory(1024, { stack: 256 });
    assert.throws(
        () => mem.alloc(769),
        { message: 'Heap capacity is not enough to write the passed data' },
    );
    console.log('✓ куча: alloc > heapCapacity (пустая куча)');
}

// Точное заполнение всей кучи
{
    const mem = new Memory(50, { stack: 10 });
    // Куча = 40
    const p1 = mem.alloc(40);
    assert.throws(
        () => mem.alloc(1),
        { message: 'Heap capacity is not enough to write the passed data' },
    );
    p1.free();
    console.log('✓ куча: точное заполнение всей кучи');
}

// Занятая куча — не хватает для нового alloc
{
    const mem = new Memory(1024, { stack: 256 });
    mem.alloc(760);
    assert.throws(
        () => mem.alloc(9),
        { message: 'Heap capacity is not enough to write the passed data' },
    );
    console.log('✓ куча: alloc при переполнении (занятая куча)');
}

// heapCapacity = 0 → alloc(1) бросает ошибку
{
    const mem = new Memory(100, { stack: 100 });
    assert.strictEqual(mem.heapCapacity, 0);
    assert.throws(
        () => mem.alloc(1),
        { message: 'Heap capacity is not enough to write the passed data' },
    );
    console.log('✓ куча: heapCapacity = 0 → alloc(1) → ошибка');
}

// ============================================
//  Повторное использование освобождённой памяти (first-fit)
// ============================================

// Освобождение первого блока → новый alloc в начале кучи
{
    const mem = new Memory(100, { stack: 20 });
    const p1 = mem.alloc(10);
    const p2 = mem.alloc(10);

    p1.free();

    const p3 = mem.alloc(8);
    p3.change(makeBuffer(1, 2, 3, 4, 5, 6, 7, 8));
    assert.deepStrictEqual(toBytes(p3.deref()), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.strictEqual(p2.deref().byteLength, 10);

    p2.free();
    p3.free();
    console.log('✓ куча: повторное использование — начало кучи');
}

// Освобождение среднего блока → новый alloc в середине
{
    const mem = new Memory(100, { stack: 20 });
    const p1 = mem.alloc(20);
    const p2 = mem.alloc(20);
    const p3 = mem.alloc(20);

    p2.free();

    const p4 = mem.alloc(15);
    p4.change(makeBuffer(...Array.from({ length: 15 }, () => 0xBB)));
    assert.deepStrictEqual(toBytes(p4.deref()), Array.from({ length: 15 }, () => 0xBB));
    assert.strictEqual(p1.deref().byteLength, 20);
    assert.strictEqual(p3.deref().byteLength, 20);

    p1.free();
    p3.free();
    p4.free();
    console.log('✓ куча: повторное использование — середина');
}

// Выделение ровно в размер освобождённого промежутка
{
    const mem = new Memory(100, { stack: 20 });
    const p1 = mem.alloc(10);
    const p2 = mem.alloc(10);
    const p3 = mem.alloc(10);

    p2.free();

    const p4 = mem.alloc(10);
    p4.change(makeBuffer(...Array.from({ length: 10 }, () => 0xEE)));
    assert.deepStrictEqual(toBytes(p4.deref()), Array.from({ length: 10 }, () => 0xEE));

    p1.free();
    p3.free();
    p4.free();
    console.log('✓ куча: выделение ровно в размер промежутка');
}

// Выделение в конце после существующих блоков
{
    const mem = new Memory(100, { stack: 20 });
    const p1 = mem.alloc(20);
    const p2 = mem.alloc(20);
    const p3 = mem.alloc(30);
    p3.change(makeBuffer(...Array.from({ length: 30 }, () => 0xFF)));
    assert.deepStrictEqual(toBytes(p3.deref()), Array.from({ length: 30 }, () => 0xFF));

    p1.free();
    p2.free();
    p3.free();
    console.log('✓ куча: выделение в конце после существующих блоков');
}

// First-fit: выбирает первый подходящий промежуток, а не самый маленький
{
    const mem = new Memory(200, { stack: 20 });
    // Куча = 180
    const p1 = mem.alloc(20);
    const p2 = mem.alloc(30);
    const p3 = mem.alloc(20);
    const p4 = mem.alloc(10);

    // Освобождаем p1 (20 байт) и p3 (20 байт) — два промежутка
    p1.free();
    p3.free();

    // alloc(15) — должен попасть в первый промежуток (20 байт в начале)
    const p5 = mem.alloc(15);
    p5.change(makeBuffer(...Array.from({ length: 15 }, () => 0xAA)));
    assert.deepStrictEqual(toBytes(p5.deref()), Array.from({ length: 15 }, () => 0xAA));

    // p2 и p4 не повреждены
    assert.strictEqual(p2.deref().byteLength, 30);
    assert.strictEqual(p4.deref().byteLength, 10);

    p2.free();
    p4.free();
    p5.free();
    console.log('✓ куча: first-fit — выбирает первый подходящий промежуток');
}

// ============================================
//  Дефрагментация
// ============================================

// Базовая дефрагментация: фрагментированные промежутки объединяются
{
    const mem = new Memory(100, { stack: 20 });
    // Куча = 80
    const p1 = mem.alloc(15);
    p1.change(makeBuffer(...Array.from({ length: 15 }, () => 0x11)));
    const p2 = mem.alloc(15);
    p2.change(makeBuffer(...Array.from({ length: 15 }, () => 0x22)));
    const p3 = mem.alloc(15);
    p3.change(makeBuffer(...Array.from({ length: 15 }, () => 0x33)));
    const p4 = mem.alloc(15);
    p4.change(makeBuffer(...Array.from({ length: 15 }, () => 0x44)));

    // Освобождаем 2-й и 3-й → 30 байт фрагментировано
    p2.free();
    p3.free();

    // [15 занято][15 свободно][15 свободно][15 занято][20 свободно]
    // alloc(25) — не влезает ни в 15, ни в 20 → дефрагментация
    const p5 = mem.alloc(25);
    p5.change(makeBuffer(...Array.from({ length: 25 }, () => 0x55)));

    assert.deepStrictEqual(toBytes(p5.deref()), Array.from({ length: 25 }, () => 0x55));
    assert.deepStrictEqual(toBytes(p1.deref()), Array.from({ length: 15 }, () => 0x11));
    assert.deepStrictEqual(toBytes(p4.deref()), Array.from({ length: 15 }, () => 0x44));

    p1.free();
    p4.free();
    p5.free();
    console.log('✓ куча: дефрагментация при нехватке непрерывного пространства');
}

// Дефрагментация с освобождённым началом кучи
{
    const mem = new Memory(100, { stack: 10 });
    // Куча = 90
    const p1 = mem.alloc(15);
    p1.change(makeBuffer(...Array.from({ length: 15 }, () => 0xAA)));
    const p2 = mem.alloc(15);
    p2.change(makeBuffer(...Array.from({ length: 15 }, () => 0xBB)));
    const p3 = mem.alloc(15);
    p3.change(makeBuffer(...Array.from({ length: 15 }, () => 0xCC)));
    const p4 = mem.alloc(15);
    p4.change(makeBuffer(...Array.from({ length: 15 }, () => 0xDD)));

    // Освобождаем первый и второй → 30 байт в начале
    p1.free();
    p2.free();

    // Состояние: [15 свободно][15 свободно][15 занято (p3)][15 занято (p4)][30 свободно]
    // alloc(35) — не влезает в начало (30) и не влезает в конец (30) → дефрагментация
    // После дефрагментации: [15 p3][15 p4][60 свободно] → 35 <= 60 ✓
    const p5 = mem.alloc(35);
    p5.change(makeBuffer(...Array.from({ length: 35 }, () => 0xEE)));

    assert.deepStrictEqual(toBytes(p5.deref()), Array.from({ length: 35 }, () => 0xEE));
    assert.deepStrictEqual(toBytes(p3.deref()), Array.from({ length: 15 }, () => 0xCC));
    assert.deepStrictEqual(toBytes(p4.deref()), Array.from({ length: 15 }, () => 0xDD));

    p3.free();
    p4.free();
    p5.free();
    console.log('✓ куча: дефрагментация с освобождённым началом кучи');
}

// Дефрагментация не помогает — всё равно не хватает
{
    const mem = new Memory(100, { stack: 20 });
    // Куча = 80
    mem.alloc(70);

    assert.throws(
        () => mem.alloc(15),
        { message: 'Heap capacity is not enough to write the passed data' },
    );
    console.log('✓ куча: ошибка когда даже дефрагментация не помогает');
}

// Дефрагментация: данные сохраняются после перемещения
{
    const mem = new Memory(150, { stack: 20 });
    // Куча = 130
    const p1 = mem.alloc(15);
    p1.change(makeBuffer(...Array.from({ length: 15 }, (_, i) => i)));
    const p2 = mem.alloc(15);
    p2.change(makeBuffer(...Array.from({ length: 15 }, (_, i) => i + 100)));
    const p3 = mem.alloc(15);
    p3.change(makeBuffer(...Array.from({ length: 15 }, (_, i) => (i + 200) % 256)));
    const p4 = mem.alloc(15);
    p4.change(makeBuffer(...Array.from({ length: 15 }, (_, i) => (i + 50) % 256)));

    // Освобождаем первый и второй → 30 байт в начале
    p1.free();
    p2.free();

    // Состояние: [15 свободно][15 свободно][15 p3][15 p4][70 свободно]
    // alloc(75) — не влезает в начало (30) и не влезает в конец (70) → дефрагментация
    // После дефрагментации: [15 p3][15 p4][100 свободно] → 75 <= 100 ✓
    const p5 = mem.alloc(75);
    p5.change(makeBuffer(...Array.from({ length: 75 }, () => 0xFF)));

    // p3 и p4 должны сохранить данные после перемещения
    assert.deepStrictEqual(toBytes(p3.deref()), Array.from({ length: 15 }, (_, i) => (i + 200) % 256));
    assert.deepStrictEqual(toBytes(p4.deref()), Array.from({ length: 15 }, (_, i) => (i + 50) % 256));
    assert.deepStrictEqual(toBytes(p5.deref()), Array.from({ length: 75 }, () => 0xFF));

    p3.free();
    p4.free();
    p5.free();
    console.log('✓ куча: данные сохраняются после дефрагментации');
}

// Дефрагментация: один промежуток между двумя блоками
{
    const mem = new Memory(120, { stack: 20 });
    // Куча = 100
    const p1 = mem.alloc(20);
    p1.change(makeBuffer(...Array.from({ length: 20 }, () => 0x11)));
    const p2 = mem.alloc(30);
    const p3 = mem.alloc(20);
    p3.change(makeBuffer(...Array.from({ length: 20 }, () => 0x33)));

    // Освобождаем средний блок → промежуток 30 байт
    p2.free();

    // Состояние: [20 p1][30 свободно][20 p3][30 свободно]
    // alloc(45) — не влезает ни в 30, ни в 30 → дефрагментация
    // После дефрагментации: [20 p1][20 p3][60 свободно] → 45 <= 60 ✓
    const p4 = mem.alloc(45);
    p4.change(makeBuffer(...Array.from({ length: 45 }, () => 0xAB)));
    assert.deepStrictEqual(toBytes(p4.deref()), Array.from({ length: 45 }, () => 0xAB));

    // p1 и p3 сохраняют данные
    assert.deepStrictEqual(toBytes(p1.deref()), Array.from({ length: 20 }, () => 0x11));
    assert.deepStrictEqual(toBytes(p3.deref()), Array.from({ length: 20 }, () => 0x33));

    p1.free();
    p3.free();
    p4.free();
    console.log('✓ куча: дефрагментация — один промежуток между двумя блоками');
}

// ============================================
//  Множественные циклы alloc/free
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });

    for (let cycle = 0; cycle < 5; cycle++) {
        const ptrs = [];
        for (let i = 0; i < 10; i++) {
            const ptr = mem.alloc(16);
            ptr.change(makeBuffer(...Array.from({ length: 16 }, () => cycle * 10 + i)));
            ptrs.push(ptr);
        }

        for (let i = 0; i < 10; i++) {
            const expected = Array.from({ length: 16 }, () => cycle * 10 + i);
            assert.deepStrictEqual(toBytes(ptrs[i]!.deref()), expected);
        }

        for (const ptr of ptrs) ptr.free();
    }
    console.log('✓ куча: 5 циклов alloc/free по 10 указателей');
}

// ============================================
//  Выделение всей кучи одним блоком
// ============================================

{
    const mem = new Memory(100, { stack: 20 });
    // Куча = 80
    const ptr = mem.alloc(80);
    ptr.change(makeBuffer(...Array.from({ length: 80 }, (_, i) => i % 256)));
    assert.deepStrictEqual(toBytes(ptr.deref()), Array.from({ length: 80 }, (_, i) => i % 256));

    assert.throws(() => mem.alloc(1), { message: 'Heap capacity is not enough to write the passed data' });

    ptr.free();

    // После free можно снова выделить
    const ptr2 = mem.alloc(80);
    assert.strictEqual(ptr2.deref().byteLength, 80);
    ptr2.free();
    console.log('✓ куча: выделение всей кучи одним блоком + повторное выделение после free');
}

// ============================================
//  Стек и куча: независимость
// ============================================

{
    const mem = new Memory(100, { stack: 40 });

    const sp1 = mem.push(makeBuffer(0xAA, 0xBB));
    const hp1 = mem.alloc(20);
    hp1.change(makeBuffer(...Array.from({ length: 20 }, () => 0xCC)));

    const sp2 = mem.push(makeBuffer(0xDD));
    const hp2 = mem.alloc(10);
    hp2.change(makeBuffer(...Array.from({ length: 10 }, () => 0xEE)));

    // Все указатели валидны
    assert.deepStrictEqual(toBytes(sp1.deref()), [0xAA, 0xBB]);
    assert.deepStrictEqual(toBytes(sp2.deref()), [0xDD]);
    assert.deepStrictEqual(toBytes(hp1.deref()), Array.from({ length: 20 }, () => 0xCC));
    assert.deepStrictEqual(toBytes(hp2.deref()), Array.from({ length: 10 }, () => 0xEE));

    // Операции на стеке не влияют на кучу
    mem.pop();
    assert.deepStrictEqual(toBytes(hp1.deref()), Array.from({ length: 20 }, () => 0xCC));
    assert.deepStrictEqual(toBytes(hp2.deref()), Array.from({ length: 10 }, () => 0xEE));

    // Операции на куче не влияют на стек
    hp1.free();
    assert.deepStrictEqual(toBytes(sp1.deref()), [0xAA, 0xBB]);

    hp2.free();
    console.log('✓ куча и стек: полная независимость операций');
}

// ============================================
//  Освобождение в произвольном порядке
// ============================================

{
    const mem = new Memory(200, { stack: 20 });
    const p1 = mem.alloc(20);
    const p2 = mem.alloc(20);
    const p3 = mem.alloc(20);
    const p4 = mem.alloc(20);

    p1.change(makeBuffer(...Array.from({ length: 20 }, () => 0x11)));
    p2.change(makeBuffer(...Array.from({ length: 20 }, () => 0x22)));
    p3.change(makeBuffer(...Array.from({ length: 20 }, () => 0x33)));
    p4.change(makeBuffer(...Array.from({ length: 20 }, () => 0x44)));

    // Освобождаем в обратном порядке
    p4.free();
    p3.free();
    p2.free();

    // p1 всё ещё валиден
    assert.deepStrictEqual(toBytes(p1.deref()), Array.from({ length: 20 }, () => 0x11));

    // Можем выделить в освобождённое пространство
    const p5 = mem.alloc(50);
    p5.change(makeBuffer(...Array.from({ length: 50 }, () => 0x55)));
    assert.deepStrictEqual(toBytes(p5.deref()), Array.from({ length: 50 }, () => 0x55));

    p1.free();
    p5.free();
    console.log('✓ куча: освобождение в обратном порядке');
}

// Освобождение в случайном порядке
{
    const mem = new Memory(200, { stack: 20 });
    const p1 = mem.alloc(20);
    const p2 = mem.alloc(20);
    const p3 = mem.alloc(20);
    const p4 = mem.alloc(20);
    const p5 = mem.alloc(20);

    p1.change(makeBuffer(...Array.from({ length: 20 }, () => 0x11)));
    p2.change(makeBuffer(...Array.from({ length: 20 }, () => 0x22)));
    p3.change(makeBuffer(...Array.from({ length: 20 }, () => 0x33)));
    p4.change(makeBuffer(...Array.from({ length: 20 }, () => 0x44)));
    p5.change(makeBuffer(...Array.from({ length: 20 }, () => 0x55)));

    // Освобождаем 3, 1, 5
    p3.free();
    p1.free();
    p5.free();

    // p2 и p4 всё ещё валидны
    assert.deepStrictEqual(toBytes(p2.deref()), Array.from({ length: 20 }, () => 0x22));
    assert.deepStrictEqual(toBytes(p4.deref()), Array.from({ length: 20 }, () => 0x44));

    p2.free();
    p4.free();
    console.log('✓ куча: освобождение в произвольном порядке');
}

// ============================================
//  Промежуток слишком мал — alloc ищет дальше
// ============================================

{
    const mem = new Memory(200, { stack: 20 });
    // Куча = 180
    const p1 = mem.alloc(10);
    const p2 = mem.alloc(30);
    const p3 = mem.alloc(10);

    p1.free(); // промежуток 10 байт в начале

    // alloc(20) — не влезает в промежуток 10, должен выделиться после p3
    const p4 = mem.alloc(20);
    p4.change(makeBuffer(...Array.from({ length: 20 }, () => 0xAA)));
    assert.deepStrictEqual(toBytes(p4.deref()), Array.from({ length: 20 }, () => 0xAA));

    // p2 и p3 не повреждены
    assert.strictEqual(p2.deref().byteLength, 30);
    assert.strictEqual(p3.deref().byteLength, 10);

    p2.free();
    p3.free();
    p4.free();
    console.log('✓ куча: промежуток слишком мал — alloc ищет дальше');
}

// ============================================
//  Смежные освобождённые блоки (не сливаются автоматически)
// ============================================

{
    const mem = new Memory(200, { stack: 20 });
    // Куча = 180
    const p1 = mem.alloc(20);
    const p2 = mem.alloc(20);
    const p3 = mem.alloc(20);
    const p4 = mem.alloc(20);

    p2.free();
    p3.free();
    // Два смежных промежутка по 20 = 40 свободных байт

    // alloc(35) — не влезает в один промежуток (20), но влезает в объединённый (40)
    // Поскольку промежутки смежные, алгоритм должен найти 40-байтный gap
    // Проверяем: nextToCurrPtr для p1 = p1+20 = начало бывшего p2
    // nearest для p1 = p4 (следующий аллоцированный)
    // gap = p4 - (p1+20) = 40 >= 35 → выделяется
    const p5 = mem.alloc(35);
    p5.change(makeBuffer(...Array.from({ length: 35 }, () => 0xDD)));
    assert.deepStrictEqual(toBytes(p5.deref()), Array.from({ length: 35 }, () => 0xDD));

    p1.free();
    p4.free();
    p5.free();
    console.log('✓ куча: смежные освобождённые блоки образуют один промежуток');
}

// ============================================
//  Большой блок на куче
// ============================================

{
    const mem = new Memory(2048, { stack: 48 });
    // Куча = 2000
    const ptr = mem.alloc(1500);
    const data = Array.from({ length: 1500 }, (_, i) => i % 256);
    ptr.change(makeBuffer(...data));
    assert.deepStrictEqual(toBytes(ptr.deref()), data);
    ptr.free();
    console.log('✓ куча: большой блок (1500 байт)');
}

console.log('\n=== Все тесты кучи пройдены ===');