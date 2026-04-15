import assert from 'node:assert/strict';
import { StringsBuffer, encodeStrings, decodeStrings } from './solution.mts';

// === Конструктор и size ===

const buf1 = new StringsBuffer(['hello', 'world']);
assert.strictEqual(buf1.size, 2);

const bufEmpty = new StringsBuffer([]);
assert.strictEqual(bufEmpty.size, 0);

const bufSingle = new StringsBuffer(['one']);
assert.strictEqual(bufSingle.size, 1);

console.log('✓ constructor / size');

// === at() ===

const buf2 = new StringsBuffer(['foo', 'bar', 'baz']);

// Прямые индексы
assert.strictEqual(buf2.at(0), 'foo');
assert.strictEqual(buf2.at(1), 'bar');
assert.strictEqual(buf2.at(2), 'baz');

// Отрицательные индексы
assert.strictEqual(buf2.at(-1), 'baz');
assert.strictEqual(buf2.at(-2), 'bar');
assert.strictEqual(buf2.at(-3), 'foo');

// Выход за границы
assert.strictEqual(buf2.at(3), undefined);
assert.strictEqual(buf2.at(-4), undefined);
assert.strictEqual(buf2.at(100), undefined);

console.log('✓ at()');

// === Пустые строки ===

const bufWithEmpty = new StringsBuffer(['', 'a', '']);
assert.strictEqual(bufWithEmpty.size, 3);
assert.strictEqual(bufWithEmpty.at(0), '');
assert.strictEqual(bufWithEmpty.at(1), 'a');
assert.strictEqual(bufWithEmpty.at(2), '');

console.log('✓ пустые строки');

// === Юникод ===

const bufUnicode = new StringsBuffer(['Привет', '🌍', 'café']);
assert.strictEqual(bufUnicode.size, 3);
assert.strictEqual(bufUnicode.at(0), 'Привет');
assert.strictEqual(bufUnicode.at(1), '🌍');
assert.strictEqual(bufUnicode.at(2), 'café');

console.log('✓ юникод');

// === Symbol.iterator / values() ===

const buf3 = new StringsBuffer(['a', 'b', 'c']);
const fromIter = [...buf3];
assert.deepStrictEqual(fromIter, ['a', 'b', 'c']);

const fromValues = [...buf3.values()];
assert.deepStrictEqual(fromValues, ['a', 'b', 'c']);

// Пустой буфер
assert.deepStrictEqual([...new StringsBuffer([])], []);

console.log('✓ Symbol.iterator / values()');

// === entries() ===

const entriesResult = [...buf3.entries()];
assert.deepStrictEqual(entriesResult, [[0, 'a'], [1, 'b'], [2, 'c']]);

console.log('✓ entries()');

// === encodeStrings / decodeStrings ===

const original = ['hello', 'world', '!'];
const encoded = encodeStrings(original);
const decoded = decodeStrings(encoded);
assert.deepStrictEqual(decoded, original);

// Roundtrip с пустым массивом
assert.deepStrictEqual(decodeStrings(encodeStrings([])), []);

// Roundtrip с юникодом
const unicodeArr = ['Привет', 'мир', '🎉'];
assert.deepStrictEqual(decodeStrings(encodeStrings(unicodeArr)), unicodeArr);

console.log('✓ encodeStrings / decodeStrings');

console.log('\n✅ Все тесты hw_01 пройдены!');
