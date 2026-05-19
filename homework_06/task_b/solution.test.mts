import assert from 'node:assert/strict';
import { FreeShiftableArray } from './solution.mjs';

// === Конструктор ===

{
    const arr = new FreeShiftableArray();
    assert.strictEqual(arr.size, 0);
    assert.strictEqual(arr.capacity, 1);
    assert.strictEqual(arr.isEmpty, true);
    assert.strictEqual(arr.isFull, false);
}

{
    const arr = new FreeShiftableArray(8);
    assert.strictEqual(arr.size, 0);
    assert.strictEqual(arr.capacity, 8);
}

{
    assert.throws(() => new FreeShiftableArray(0), RangeError);
    assert.throws(() => new FreeShiftableArray(-1), RangeError);
    assert.throws(() => new FreeShiftableArray(-100), RangeError);
}

console.log('✓ constructor');

// === push ===

{
    const arr = new FreeShiftableArray<number>(4);

    assert.strictEqual(arr.push(10), 1);
    assert.strictEqual(arr.size, 1);
    assert.strictEqual(arr.at(0), 10);

    assert.strictEqual(arr.push(20), 2);
    assert.strictEqual(arr.push(30), 3);
    assert.strictEqual(arr.push(40), 4);
    assert.strictEqual(arr.size, 4);
    assert.strictEqual(arr.isFull, true);

    // Должен вызвать extend
    assert.strictEqual(arr.push(50), 5);
    assert.strictEqual(arr.capacity, 8);
    assert.strictEqual(arr.size, 5);
    assert.strictEqual(arr.isFull, false);

    // Проверяем порядок
    assert.strictEqual(arr.at(0), 10);
    assert.strictEqual(arr.at(1), 20);
    assert.strictEqual(arr.at(2), 30);
    assert.strictEqual(arr.at(3), 40);
    assert.strictEqual(arr.at(4), 50);
}

console.log('✓ push');

// === pop ===

{
    const arr = new FreeShiftableArray<number>(4);
    arr.push(1);
    arr.push(2);
    arr.push(3);

    assert.strictEqual(arr.pop(), 3);
    assert.strictEqual(arr.size, 2);

    assert.strictEqual(arr.pop(), 2);
    assert.strictEqual(arr.pop(), 1);
    assert.strictEqual(arr.size, 0);
    assert.strictEqual(arr.isEmpty, true);

    // pop на пустом
    assert.strictEqual(arr.pop(), undefined);
    assert.strictEqual(arr.size, 0);
}

console.log('✓ pop');

// === unshift ===

{
    const arr = new FreeShiftableArray<number>(4);

    assert.strictEqual(arr.unshift(10), 1);
    assert.strictEqual(arr.size, 1);
    assert.strictEqual(arr.at(0), 10);

    assert.strictEqual(arr.unshift(20), 2);
    assert.strictEqual(arr.at(0), 20);
    assert.strictEqual(arr.at(1), 10);

    assert.strictEqual(arr.unshift(30), 3);
    assert.strictEqual(arr.unshift(40), 4);
    assert.strictEqual(arr.isFull, true);

    // Должен вызвать extend
    assert.strictEqual(arr.unshift(50), 5);
    assert.strictEqual(arr.capacity, 8);
    assert.strictEqual(arr.size, 5);

    // Порядок: 50, 40, 30, 20, 10
    assert.strictEqual(arr.at(0), 50);
    assert.strictEqual(arr.at(1), 40);
    assert.strictEqual(arr.at(2), 30);
    assert.strictEqual(arr.at(3), 20);
    assert.strictEqual(arr.at(4), 10);
}

console.log('✓ unshift');

// === shift ===

{
    const arr = new FreeShiftableArray<number>(4);
    arr.push(1);
    arr.push(2);
    arr.push(3);

    assert.strictEqual(arr.shift(), 1);
    assert.strictEqual(arr.size, 2);
    assert.strictEqual(arr.at(0), 2);

    assert.strictEqual(arr.shift(), 2);
    assert.strictEqual(arr.shift(), 3);
    assert.strictEqual(arr.size, 0);
    assert.strictEqual(arr.isEmpty, true);

    // shift на пустом
    assert.strictEqual(arr.shift(), undefined);
    assert.strictEqual(arr.size, 0);
}

console.log('✓ shift');

// === at ===

{
    const arr = new FreeShiftableArray<string>(4);
    arr.push('a');
    arr.push('b');
    arr.push('c');

    assert.strictEqual(arr.at(0), 'a');
    assert.strictEqual(arr.at(1), 'b');
    assert.strictEqual(arr.at(2), 'c');

    // За пределами size — undefined (из буфера)
    assert.strictEqual(arr.at(3), undefined);
}

console.log('✓ at');

// === isEmpty / isFull ===

{
    const arr = new FreeShiftableArray<number>(2);
    assert.strictEqual(arr.isEmpty, true);
    assert.strictEqual(arr.isFull, false);

    arr.push(1);
    assert.strictEqual(arr.isEmpty, false);
    assert.strictEqual(arr.isFull, false);

    arr.push(2);
    assert.strictEqual(arr.isEmpty, false);
    assert.strictEqual(arr.isFull, true);

    arr.pop();
    assert.strictEqual(arr.isFull, false);

    arr.pop();
    assert.strictEqual(arr.isEmpty, true);
}

console.log('✓ isEmpty / isFull');

// === Автоматическое расширение (extend) ===

{
    // Начинаем с capacity=1
    const arr = new FreeShiftableArray<number>();
    assert.strictEqual(arr.capacity, 1);

    arr.push(1);
    assert.strictEqual(arr.capacity, 1);
    assert.strictEqual(arr.isFull, true);

    arr.push(2);
    assert.strictEqual(arr.capacity, 2);

    arr.push(3);
    assert.strictEqual(arr.capacity, 4);

    arr.push(4);
    assert.strictEqual(arr.capacity, 4);

    arr.push(5);
    assert.strictEqual(arr.capacity, 8);

    // Все элементы на месте
    assert.deepStrictEqual([...arr], [1, 2, 3, 4, 5]);
}

{
    // Extend при unshift
    const arr = new FreeShiftableArray<number>(2);
    arr.unshift(1);
    arr.unshift(2);
    assert.strictEqual(arr.isFull, true);

    arr.unshift(3);
    assert.strictEqual(arr.capacity, 4);
    assert.deepStrictEqual([...arr], [3, 2, 1]);
}

console.log('✓ extend (автоматическое расширение)');

// === Кольцевое поведение буфера ===

{
    const arr = new FreeShiftableArray<number>(4);

    // Заполняем: push 1,2,3 → shift → push 4,5
    arr.push(1);
    arr.push(2);
    arr.push(3);
    arr.shift(); // удалили 1
    arr.push(4);
    arr.push(5); // tail обернулся через начало буфера

    assert.strictEqual(arr.size, 4);
    assert.strictEqual(arr.isFull, true);
    assert.deepStrictEqual([...arr], [2, 3, 4, 5]);
}

{
    // Кольцевое поведение с unshift
    const arr = new FreeShiftableArray<number>(4);
    arr.push(1);
    arr.push(2);
    arr.push(3);
    arr.pop(); // удалили 3
    arr.unshift(0);
    arr.unshift(-1); // head обернулся через конец буфера

    assert.strictEqual(arr.size, 4);
    assert.strictEqual(arr.isFull, true);
    assert.deepStrictEqual([...arr], [-1, 0, 1, 2]);
}

console.log('✓ кольцевое поведение буфера');

// === Смешанные операции push/pop/unshift/shift ===

{
    const arr = new FreeShiftableArray<number>(4);

    arr.push(1);
    arr.push(2);
    arr.unshift(0);
    assert.deepStrictEqual([...arr], [0, 1, 2]);

    assert.strictEqual(arr.shift(), 0);
    assert.deepStrictEqual([...arr], [1, 2]);

    assert.strictEqual(arr.pop(), 2);
    assert.deepStrictEqual([...arr], [1]);

    arr.unshift(-1);
    arr.push(10);
    assert.deepStrictEqual([...arr], [-1, 1, 10]);

    arr.push(20);
    assert.strictEqual(arr.isFull, true);
    assert.deepStrictEqual([...arr], [-1, 1, 10, 20]);

    // Extend при push
    arr.push(30);
    assert.strictEqual(arr.capacity, 8);
    assert.deepStrictEqual([...arr], [-1, 1, 10, 20, 30]);
}

console.log('✓ смешанные операции');

// === Symbol.iterator ===

{
    const arr = new FreeShiftableArray<number>(4);
    assert.deepStrictEqual([...arr], []);

    arr.push(10);
    arr.push(20);
    arr.push(30);
    assert.deepStrictEqual([...arr], [10, 20, 30]);

    // Итератор можно использовать повторно (новый каждый раз)
    const first = [...arr];
    const second = [...arr];
    assert.deepStrictEqual(first, second);
}

{
    // for...of
    const arr = new FreeShiftableArray<string>(3);
    arr.push('a');
    arr.push('b');
    arr.push('c');

    const collected: (string | undefined)[] = [];
    for (const v of arr) {
        collected.push(v);
    }
    assert.deepStrictEqual(collected, ['a', 'b', 'c']);
}

console.log('✓ Symbol.iterator');

// === values() ===

{
    const arr = new FreeShiftableArray<number>(4);
    arr.push(1);
    arr.push(2);
    arr.push(3);

    const vals = [...arr.values()];
    assert.deepStrictEqual(vals, [1, 2, 3]);

    // Пустой массив
    const empty = new FreeShiftableArray();
    assert.deepStrictEqual([...empty.values()], []);
}

console.log('✓ values()');

// === entries() ===

{
    const arr = new FreeShiftableArray<string>(4);
    arr.push('x');
    arr.push('y');
    arr.push('z');

    const entries = [...arr.entries()];
    assert.deepStrictEqual(entries, [[0, 'x'], [1, 'y'], [2, 'z']]);
}

{
    // entries() после shift (кольцевой буфер)
    const arr = new FreeShiftableArray<number>(4);
    arr.push(10);
    arr.push(20);
    arr.push(30);
    arr.shift();

    const entries = [...arr.entries()];
    assert.deepStrictEqual(entries, [[0, 20], [1, 30]]);
}

{
    // Пустой
    const arr = new FreeShiftableArray();
    assert.deepStrictEqual([...arr.entries()], []);
}

console.log('✓ entries()');

// === Типизация (строки, объекты) ===

{
    const arr = new FreeShiftableArray<string>(4);
    arr.push('hello');
    arr.push('world');
    assert.strictEqual(arr.at(0), 'hello');
    assert.strictEqual(arr.at(1), 'world');
    assert.strictEqual(arr.shift(), 'hello');
    assert.strictEqual(arr.pop(), 'world');
}

{
    interface Item { id: number; name: string }
    const arr = new FreeShiftableArray<Item>(2);
    arr.push({ id: 1, name: 'a' });
    arr.push({ id: 2, name: 'b' });

    assert.deepStrictEqual(arr.at(0), { id: 1, name: 'a' });
    assert.deepStrictEqual(arr.at(1), { id: 2, name: 'b' });
}

console.log('✓ типизация (строки, объекты)');

// === Стресс-тест: много операций ===

{
    const arr = new FreeShiftableArray<number>();
    const N = 1000;

    // Заполняем push
    for (let i = 0; i < N; i++) {
        arr.push(i);
    }
    assert.strictEqual(arr.size, N);

    // Проверяем порядок
    for (let i = 0; i < N; i++) {
        assert.strictEqual(arr.at(i), i);
    }

    // Удаляем всё через shift
    for (let i = 0; i < N; i++) {
        assert.strictEqual(arr.shift(), i);
    }
    assert.strictEqual(arr.size, 0);
    assert.strictEqual(arr.isEmpty, true);
}

{
    const arr = new FreeShiftableArray<number>();
    const N = 1000;

    // Заполняем unshift
    for (let i = 0; i < N; i++) {
        arr.unshift(i);
    }
    assert.strictEqual(arr.size, N);

    // Порядок: N-1, N-2, ..., 1, 0
    for (let i = 0; i < N; i++) {
        assert.strictEqual(arr.at(i), N - 1 - i);
    }

    // Удаляем всё через pop
    for (let i = 0; i < N; i++) {
        assert.strictEqual(arr.pop(), i);
    }
    assert.strictEqual(arr.size, 0);
}

console.log('✓ стресс-тест (1000 операций)');

// === Чередование push/shift (очередь) ===

{
    const arr = new FreeShiftableArray<number>(4);

    for (let i = 0; i < 100; i++) {
        arr.push(i);
    }

    for (let i = 0; i < 100; i++) {
        assert.strictEqual(arr.shift(), i);
    }

    assert.strictEqual(arr.isEmpty, true);
}

{
    // Чередование по одному
    const arr = new FreeShiftableArray<number>(2);

    for (let i = 0; i < 50; i++) {
        arr.push(i);
        assert.strictEqual(arr.shift(), i);
    }

    assert.strictEqual(arr.isEmpty, true);
    assert.strictEqual(arr.size, 0);
}

console.log('✓ чередование push/shift (очередь)');

// === Чередование unshift/pop (стек с другого конца) ===

{
    const arr = new FreeShiftableArray<number>(2);

    // unshift вставляет в начало, pop удаляет с конца
    // При size=1 это один и тот же элемент
    for (let i = 0; i < 50; i++) {
        arr.unshift(i);
        assert.strictEqual(arr.pop(), i);
    }
    assert.strictEqual(arr.isEmpty, true);
    assert.strictEqual(arr.size, 0);
}

{
    const arr = new FreeShiftableArray<number>(4);
    arr.unshift(1);
    arr.unshift(2);
    arr.unshift(3);

    // pop удаляет с конца: 1, 2, 3 → pop → 1
    assert.strictEqual(arr.pop(), 1);
    assert.strictEqual(arr.pop(), 2);
    assert.strictEqual(arr.pop(), 3);
    assert.strictEqual(arr.isEmpty, true);
}

console.log('✓ чередование unshift/pop');

// === Множественные extend ===

{
    const arr = new FreeShiftableArray<number>(1);
    // 1 → 2 → 4 → 8 → 16 → 32
    for (let i = 0; i < 20; i++) {
        arr.push(i);
    }
    assert.strictEqual(arr.capacity, 32);
    assert.strictEqual(arr.size, 20);
    assert.deepStrictEqual([...arr], Array.from({ length: 20 }, (_, i) => i));
}

console.log('✓ множественные extend');

// === Extend сохраняет порядок при кольцевом буфере ===

{
    const arr = new FreeShiftableArray<number>(4);
    arr.push(1);
    arr.push(2);
    arr.push(3);
    arr.push(4);
    // Буфер полон: [1, 2, 3, 4], head=0, tail=0

    arr.shift(); // удалили 1, head=1
    arr.shift(); // удалили 2, head=2
    arr.push(5); // tail=1 (обернулся)
    arr.push(6); // tail=2, буфер полон: [5, 6, 3, 4], head=2

    assert.deepStrictEqual([...arr], [3, 4, 5, 6]);

    // Теперь extend
    arr.push(7); // вызовет extend
    assert.strictEqual(arr.capacity, 8);
    assert.deepStrictEqual([...arr], [3, 4, 5, 6, 7]);
}

console.log('✓ extend сохраняет порядок при кольцевом буфере');

// === Граничные случаи ===

{
    // Capacity = 1
    const arr = new FreeShiftableArray<number>(1);
    arr.push(42);
    assert.strictEqual(arr.at(0), 42);
    assert.strictEqual(arr.isFull, true);

    arr.push(43); // extend
    assert.strictEqual(arr.capacity, 2);
    assert.deepStrictEqual([...arr], [42, 43]);
}

{
    // Без аргумента capacity
    const arr = new FreeShiftableArray<number>();
    assert.strictEqual(arr.capacity, 1);
    arr.push(1);
    assert.strictEqual(arr.isFull, true);
    arr.push(2);
    assert.strictEqual(arr.capacity, 2);
}

{
    // Pop/shift на пустом не ломают состояние
    const arr = new FreeShiftableArray<number>(4);
    arr.pop();
    arr.shift();
    arr.pop();
    arr.shift();
    assert.strictEqual(arr.size, 0);
    assert.strictEqual(arr.isEmpty, true);

    // После этого push/unshift работают
    arr.push(1);
    arr.unshift(0);
    assert.deepStrictEqual([...arr], [0, 1]);
}

console.log('✓ граничные случаи');

console.log('\n✅ Все тесты FreeShiftableArray пройдены!');
