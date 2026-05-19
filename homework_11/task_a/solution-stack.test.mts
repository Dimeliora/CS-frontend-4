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
//  Конструктор Memory
// ============================================

// stack > size → RangeError
{
    assert.throws(
        () => new Memory(100, { stack: 200 }),
        { constructor: RangeError, message: 'Stack size should be less or equal the total size' },
    );
    console.log('✓ конструктор: stack > size → RangeError');
}

// stack === size → heapCapacity = 0
{
    const mem = new Memory(512, { stack: 512 });
    assert.strictEqual(mem.totalCapacity, 512);
    assert.strictEqual(mem.stackCapacity, 512);
    assert.strictEqual(mem.heapCapacity, 0);
    console.log('✓ конструктор: stack === size, heapCapacity = 0');
}

// stack = 0 → stackCapacity = 0, heapCapacity = totalCapacity
{
    const mem = new Memory(256, { stack: 0 });
    assert.strictEqual(mem.stackCapacity, 0);
    assert.strictEqual(mem.heapCapacity, 256);
    console.log('✓ конструктор: stack = 0, вся память — куча');
}

// ============================================
//  push / pop: LIFO порядок
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    mem.push(makeBuffer(10, 20));
    mem.push(makeBuffer(30, 40, 50));
    mem.push(makeBuffer(60));

    assert.deepStrictEqual(toBytes(mem.pop()!), [60]);
    assert.deepStrictEqual(toBytes(mem.pop()!), [30, 40, 50]);
    assert.deepStrictEqual(toBytes(mem.pop()!), [10, 20]);
    assert.strictEqual(mem.pop(), undefined);
    console.log('✓ стек: три кадра снимаются в LIFO порядке');
}

// ============================================
//  pop на пустом стеке
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    assert.strictEqual(mem.pop(), undefined);
    assert.strictEqual(mem.pop(), undefined);
    console.log('✓ стек: повторный pop на пустом стеке → undefined');
}

// ============================================
//  push пустого буфера (0 байт данных + 4 байта PTR)
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer());
    assert.deepStrictEqual(toBytes(ptr.deref()), []);

    const popped = mem.pop()!;
    assert.deepStrictEqual(toBytes(popped), []);
    console.log('✓ стек: push/pop пустого буфера');
}

// ============================================
//  Несколько пустых кадров подряд
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    const p1 = mem.push(makeBuffer());
    const p2 = mem.push(makeBuffer());
    const p3 = mem.push(makeBuffer());

    assert.deepStrictEqual(toBytes(p1.deref()), []);
    assert.deepStrictEqual(toBytes(p2.deref()), []);
    assert.deepStrictEqual(toBytes(p3.deref()), []);

    assert.deepStrictEqual(toBytes(mem.pop()!), []);
    assert.deepStrictEqual(toBytes(mem.pop()!), []);
    assert.deepStrictEqual(toBytes(mem.pop()!), []);
    assert.strictEqual(mem.pop(), undefined);
    console.log('✓ стек: несколько пустых кадров подряд');
}

// ============================================
//  Переполнение стека: один кадр
// ============================================

// PTR_SIZE = 4, стек = 10 → макс. данных = 6
{
    const mem = new Memory(1024, { stack: 10 });
    // Ровно 6 байт — влезает
    const ptr = mem.push(makeBuffer(1, 2, 3, 4, 5, 6));
    assert.deepStrictEqual(toBytes(ptr.deref()), [1, 2, 3, 4, 5, 6]);

    console.log('✓ стек: push заполняет стек до предела (один кадр)');
}

{
    const mem = new Memory(1024, { stack: 10 });
    // 7 байт данных + 4 PTR = 11 > 10
    assert.throws(
        () => mem.push(makeBuffer(1, 2, 3, 4, 5, 6, 7)),
        { message: 'Maximum stack size exceeded' },
    );
    console.log('✓ стек: push при переполнении (один кадр)');
}

// ============================================
//  Переполнение стека: несколько кадров
// ============================================

{
    // Стек = 12. Кадр = data + 4. Два кадра по 2 байта = (2+4)*2 = 12 — ровно
    const mem = new Memory(1024, { stack: 12 });
    mem.push(makeBuffer(1, 2));
    mem.push(makeBuffer(3, 4));

    // Третий кадр: минимум 0+4 = 4 байта, но осталось 0
    assert.throws(
        () => mem.push(makeBuffer(5)),
        { message: 'Maximum stack size exceeded' },
    );
    console.log('✓ стек: переполнение при нескольких кадрах');
}

// Даже пустой кадр (0 данных + 4 PTR) не влезает, если осталось < 4 байт
{
    // Стек = 7. Первый кадр: 3+4 = 7 → стек полон
    const mem = new Memory(1024, { stack: 7 });
    mem.push(makeBuffer(1, 2, 3));

    assert.throws(
        () => mem.push(makeBuffer()),
        { message: 'Maximum stack size exceeded' },
    );
    console.log('✓ стек: пустой кадр не влезает, если нет места даже для PTR');
}

// ============================================
//  deref: чтение нескольких указателей одновременно
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    const p1 = mem.push(makeBuffer(0xAA));
    const p2 = mem.push(makeBuffer(0xBB, 0xCC));
    const p3 = mem.push(makeBuffer(0xDD, 0xEE, 0xFF));

    assert.deepStrictEqual(toBytes(p1.deref()), [0xAA]);
    assert.deepStrictEqual(toBytes(p2.deref()), [0xBB, 0xCC]);
    assert.deepStrictEqual(toBytes(p3.deref()), [0xDD, 0xEE, 0xFF]);
    console.log('✓ стек: deref нескольких указателей одновременно');
}

// deref возвращает копию (slice), а не ссылку
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer(1, 2));
    const a = ptr.deref();
    const b = ptr.deref();
    assert.notStrictEqual(a, b);
    console.log('✓ стек: deref возвращает копию (разные объекты)');
}

// ============================================
//  change: замена данных по указателю
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer(1, 2, 3));
    ptr.change(makeBuffer(7, 8, 9));
    assert.deepStrictEqual(toBytes(ptr.deref()), [7, 8, 9]);
    console.log('✓ стек: change заменяет данные (тот же размер)');
}

// change с меньшим буфером — остаток обнуляется
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer(1, 2, 3, 4, 5));
    ptr.change(makeBuffer(42));
    assert.deepStrictEqual(toBytes(ptr.deref()), [42, 0, 0, 0, 0]);
    console.log('✓ стек: change с меньшим буфером обнуляет остаток');
}

// change с пустым буфером — все байты обнуляются
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer(1, 2, 3));
    ptr.change(makeBuffer());
    assert.deepStrictEqual(toBytes(ptr.deref()), [0, 0, 0]);
    console.log('✓ стек: change с пустым буфером обнуляет все данные');
}

// change с превышением capacity → ошибка
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer(1, 2));
    assert.throws(
        () => ptr.change(makeBuffer(1, 2, 3)),
        { message: 'Frame capacity is not enough to write the passed data' },
    );
    console.log('✓ стек: change с превышением capacity → ошибка');
}

// change не затрагивает соседние кадры
{
    const mem = new Memory(1024, { stack: 256 });
    const p1 = mem.push(makeBuffer(0xAA, 0xBB));
    const p2 = mem.push(makeBuffer(0xCC, 0xDD));

    p1.change(makeBuffer(0x11, 0x22));

    assert.deepStrictEqual(toBytes(p1.deref()), [0x11, 0x22]);
    assert.deepStrictEqual(toBytes(p2.deref()), [0xCC, 0xDD]);
    console.log('✓ стек: change не затрагивает соседние кадры');
}

// Многократный change одного указателя
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer(0, 0, 0, 0));

    for (let i = 1; i <= 10; i++) {
        ptr.change(makeBuffer(i, i, i, i));
        assert.deepStrictEqual(toBytes(ptr.deref()), [i, i, i, i]);
    }
    console.log('✓ стек: многократный change одного указателя');
}

// ============================================
//  Proxy revoke: защита от UB
// ============================================

// deref после pop → TypeError (proxy revoked)
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer(1, 2, 3));
    mem.pop();

    assert.throws(() => ptr.deref(), TypeError);
    console.log('✓ стек: deref после pop → TypeError');
}

// change после pop → TypeError
{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer(1, 2, 3));
    mem.pop();

    assert.throws(() => ptr.change(makeBuffer(4, 5, 6)), TypeError);
    console.log('✓ стек: change после pop → TypeError');
}

// Отзывается только верхний указатель, нижний остаётся валидным
{
    const mem = new Memory(1024, { stack: 256 });
    const p1 = mem.push(makeBuffer(1));
    const p2 = mem.push(makeBuffer(2));
    const p3 = mem.push(makeBuffer(3));

    mem.pop(); // снимает p3
    assert.throws(() => p3.deref(), TypeError);
    assert.deepStrictEqual(toBytes(p2.deref()), [2]);
    assert.deepStrictEqual(toBytes(p1.deref()), [1]);

    mem.pop(); // снимает p2
    assert.throws(() => p2.deref(), TypeError);
    assert.deepStrictEqual(toBytes(p1.deref()), [1]);

    mem.pop(); // снимает p1
    assert.throws(() => p1.deref(), TypeError);
    console.log('✓ стек: последовательный отзыв указателей при pop');
}

// ============================================
//  Повторное использование стека после полного опустошения
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });

    for (let cycle = 0; cycle < 5; cycle++) {
        const ptr = mem.push(makeBuffer(cycle, cycle + 1));
        assert.deepStrictEqual(toBytes(ptr.deref()), [cycle, cycle + 1]);
        const popped = mem.pop()!;
        assert.deepStrictEqual(toBytes(popped), [cycle, cycle + 1]);
    }
    assert.strictEqual(mem.pop(), undefined);
    console.log('✓ стек: 5 циклов push/pop — повторное использование');
}

// ============================================
//  Чередование push/pop
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });

    mem.push(makeBuffer(1));
    mem.push(makeBuffer(2));
    assert.deepStrictEqual(toBytes(mem.pop()!), [2]);

    mem.push(makeBuffer(3));
    mem.push(makeBuffer(4));
    assert.deepStrictEqual(toBytes(mem.pop()!), [4]);
    assert.deepStrictEqual(toBytes(mem.pop()!), [3]);
    assert.deepStrictEqual(toBytes(mem.pop()!), [1]);
    assert.strictEqual(mem.pop(), undefined);
    console.log('✓ стек: чередование push/pop (сложный сценарий)');
}

// ============================================
//  Большие данные в одном кадре
// ============================================

{
    const mem = new Memory(2048, { stack: 1024 });
    const bigData = Array.from({ length: 500 }, (_, i) => i % 256);
    const ptr = mem.push(makeBuffer(...bigData));
    assert.deepStrictEqual(toBytes(ptr.deref()), bigData);

    const popped = mem.pop()!;
    assert.deepStrictEqual(toBytes(popped), bigData);
    console.log('✓ стек: большой кадр (500 байт)');
}

// ============================================
//  Максимальное количество кадров (стресс-тест)
// ============================================

{
    // Каждый кадр: 1 байт данных + 4 PTR = 5 байт. Стек = 500 → 100 кадров
    const mem = new Memory(1024, { stack: 500 });
    const ptrs = [];

    for (let i = 0; i < 100; i++) {
        ptrs.push(mem.push(makeBuffer(i % 256)));
    }

    // Все указатели валидны
    for (let i = 0; i < 100; i++) {
        assert.deepStrictEqual(toBytes(ptrs[i]!.deref()), [i % 256]);
    }

    // Снимаем все в обратном порядке
    for (let i = 99; i >= 0; i--) {
        const popped = mem.pop()!;
        assert.deepStrictEqual(toBytes(popped), [i % 256]);
    }

    assert.strictEqual(mem.pop(), undefined);
    console.log('✓ стек: 100 кадров — стресс-тест');
}

// ============================================
//  change после pop соседнего кадра — нижний указатель работает
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    const p1 = mem.push(makeBuffer(0xAA, 0xBB));
    mem.push(makeBuffer(0xCC));

    mem.pop(); // снимаем верхний

    // Нижний указатель всё ещё работает для change
    p1.change(makeBuffer(0x11, 0x22));
    assert.deepStrictEqual(toBytes(p1.deref()), [0x11, 0x22]);
    console.log('✓ стек: change нижнего указателя после pop верхнего');
}

// ============================================
//  push после pop — новый кадр перезаписывает старые данные
// ============================================

{
    const mem = new Memory(1024, { stack: 20 });
    // Кадр 1: 3+4 = 7 байт
    mem.push(makeBuffer(0xFF, 0xFF, 0xFF));
    mem.pop();

    // Кадр 2: 2+4 = 6 байт — записывается с начала стека
    const ptr = mem.push(makeBuffer(0x01, 0x02));
    assert.deepStrictEqual(toBytes(ptr.deref()), [0x01, 0x02]);
    console.log('✓ стек: push после pop перезаписывает область');
}

// ============================================
//  Стек и куча не мешают друг другу
// ============================================

{
    const mem = new Memory(100, { stack: 40 });

    // Заполняем стек
    const sp = mem.push(makeBuffer(1, 2, 3));

    // Выделяем на куче
    const hp = mem.alloc(20);
    hp.change(makeBuffer(...Array.from({ length: 20 }, () => 0xAA)));

    // Стековый указатель не повреждён
    assert.deepStrictEqual(toBytes(sp.deref()), [1, 2, 3]);
    // Кучевой указатель не повреждён
    assert.deepStrictEqual(toBytes(hp.deref()), Array.from({ length: 20 }, () => 0xAA));

    hp.free();
    console.log('✓ стек и куча: независимость данных');
}

// ============================================
//  Граничный случай: стек = 4 (только PTR, 0 данных)
// ============================================

{
    const mem = new Memory(1024, { stack: 4 });
    // Пустой кадр: 0 данных + 4 PTR = 4 — ровно влезает
    const ptr = mem.push(makeBuffer());
    assert.deepStrictEqual(toBytes(ptr.deref()), []);

    // Второй пустой кадр уже не влезет
    assert.throws(
        () => mem.push(makeBuffer()),
        { message: 'Maximum stack size exceeded' },
    );

    const popped = mem.pop()!;
    assert.deepStrictEqual(toBytes(popped), []);
    console.log('✓ стек: граничный случай — стек = 4 (только PTR)');
}

// ============================================
//  pop возвращает копию данных (не ссылку на внутренний буфер)
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    mem.push(makeBuffer(1, 2, 3));
    const popped = mem.pop()!;

    // Модификация popped не должна влиять на внутренний буфер
    new Uint8Array(popped)[0] = 0xFF;

    // Повторный push/pop — данные чистые
    mem.push(makeBuffer(4, 5, 6));
    const popped2 = mem.pop()!;
    assert.deepStrictEqual(toBytes(popped2), [4, 5, 6]);
    console.log('✓ стек: pop возвращает копию (slice)');
}

// ============================================
//  change с точным размером capacity
// ============================================

{
    const mem = new Memory(1024, { stack: 256 });
    const ptr = mem.push(makeBuffer(1, 2, 3, 4, 5));
    // Ровно 5 байт — не должно бросать ошибку
    ptr.change(makeBuffer(10, 20, 30, 40, 50));
    assert.deepStrictEqual(toBytes(ptr.deref()), [10, 20, 30, 40, 50]);
    console.log('✓ стек: change с точным размером capacity');
}

console.log('\n=== Все тесты стека пройдены ===');
