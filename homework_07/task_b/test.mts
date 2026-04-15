import assert from 'node:assert/strict';
import { StringsBufferImp, encodeStrings, decodeStrings } from './solution.mts';

// === Конструктор и size ===

const buf1 = new StringsBufferImp(['hello', 'world']);
assert.strictEqual(buf1.size, 2);

const bufEmpty = new StringsBufferImp([]);
assert.strictEqual(bufEmpty.size, 0);

const bufSingle = new StringsBufferImp(['one']);
assert.strictEqual(bufSingle.size, 1);

console.log('✓ constructor / size');

// === at() ===

const buf2 = new StringsBufferImp(['foo', 'bar', 'baz']);

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

const bufWithEmpty = new StringsBufferImp(['', 'a', '']);
assert.strictEqual(bufWithEmpty.size, 3);
assert.strictEqual(bufWithEmpty.at(0), '');
assert.strictEqual(bufWithEmpty.at(1), 'a');
assert.strictEqual(bufWithEmpty.at(2), '');

console.log('✓ пустые строки');

// === Юникод ===

const bufUnicode = new StringsBufferImp(['Привет', '🌍', 'café']);
assert.strictEqual(bufUnicode.size, 3);
assert.strictEqual(bufUnicode.at(0), 'Привет');
assert.strictEqual(bufUnicode.at(1), '🌍');
assert.strictEqual(bufUnicode.at(2), 'café');

console.log('✓ юникод');

// === set() — замена на строку той же или меньшей длины ===

const buf3 = new StringsBufferImp(['aaa', 'bbb', 'ccc']);
buf3.set(1, 'xx');  // короче оригинала
assert.strictEqual(buf3.at(1), 'xx');
// Остальные не затронуты
assert.strictEqual(buf3.at(0), 'aaa');
assert.strictEqual(buf3.at(2), 'ccc');

buf3.set(0, 'zzz');  // та же длина
assert.strictEqual(buf3.at(0), 'zzz');

console.log('✓ set() — меньшая/равная длина');

// === set() — замена на более длинную строку ===

const buf4 = new StringsBufferImp(['a', 'b', 'c']);
buf4.set(0, 'longer_string');
assert.strictEqual(buf4.at(0), 'longer_string');
assert.strictEqual(buf4.at(1), 'b');
assert.strictEqual(buf4.at(2), 'c');

console.log('✓ set() — большая длина');

// === set() — замена с отрицательным индексом ===

const buf5 = new StringsBufferImp(['x', 'y', 'z']);
buf5.set(-1, 'last');
assert.strictEqual(buf5.at(2), 'last');

buf5.set(-3, 'first');
assert.strictEqual(buf5.at(0), 'first');

console.log('✓ set() — отрицательные индексы');

// === set() — выход за границы бросает RangeError ===

const buf6 = new StringsBufferImp(['a', 'b']);
assert.throws(() => buf6.set(2, 'x'), RangeError);
assert.throws(() => buf6.set(-3, 'x'), RangeError);
assert.throws(() => buf6.set(100, 'x'), RangeError);

console.log('✓ set() — RangeError при выходе за границы');

// === set() — юникод ===

const buf7 = new StringsBufferImp(['hello', 'world']);
buf7.set(0, 'Привет');
buf7.set(1, '🌍');
assert.strictEqual(buf7.at(0), 'Привет');
assert.strictEqual(buf7.at(1), '🌍');

console.log('✓ set() — юникод');

// === Symbol.iterator / values() ===

const buf8 = new StringsBufferImp(['a', 'b', 'c']);
assert.deepStrictEqual([...buf8], ['a', 'b', 'c']);
assert.deepStrictEqual([...buf8.values()], ['a', 'b', 'c']);
assert.deepStrictEqual([...new StringsBufferImp([])], []);

console.log('✓ Symbol.iterator / values()');

// === entries() ===

const entriesResult = [...buf8.entries()];
assert.deepStrictEqual(entriesResult, [[0, 'a'], [1, 'b'], [2, 'c']]);

console.log('✓ entries()');

// === encodeStrings / decodeStrings ===

const original = ['hello', 'world', '!'];
const encoded = encodeStrings(original);
const decoded = decodeStrings(encoded);
assert.deepStrictEqual(decoded, original);

assert.deepStrictEqual(decodeStrings(encodeStrings([])), []);

const unicodeArr = ['Привет', 'мир', '🎉'];
assert.deepStrictEqual(decodeStrings(encodeStrings(unicodeArr)), unicodeArr);

console.log('✓ encodeStrings / decodeStrings');

// === set() + итерация (roundtrip после мутации) ===

const buf9 = new StringsBufferImp(['one', 'two', 'three']);
buf9.set(1, 'TWO_MODIFIED');
assert.deepStrictEqual([...buf9], ['one', 'TWO_MODIFIED', 'three']);

console.log('✓ set() + итерация');

console.log('\n✅ Все тесты hw_02 пройдены!');
