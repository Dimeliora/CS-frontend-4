import assert from 'node:assert/strict';
import {FlatArrayImgProcessor, TraverseMode} from './solution_flat-array.mts';

// size
{
    const img = new FlatArrayImgProcessor(3, 4);
    assert.deepEqual(img.size, [3, 4]);
}

// getPixel возвращает нулевой пиксель по умолчанию
{
    const img = new FlatArrayImgProcessor(2, 2);
    assert.deepEqual(img.getPixel(0, 0), [0, 0, 0, 0]);
    assert.deepEqual(img.getPixel(1, 1), [0, 0, 0, 0]);
}

// setPixel сохраняет пиксель и возвращает его
{
    const img = new FlatArrayImgProcessor(3, 3);
    const rgba: [number, number, number, number] = [255, 128, 64, 200];
    const result = img.setPixel(1, 2, rgba);
    assert.deepEqual(result, rgba);
    assert.deepEqual(img.getPixel(1, 2), rgba);
}

// соседние пиксели не изменяются после setPixel
{
    const img = new FlatArrayImgProcessor(3, 3);
    img.setPixel(1, 1, [10, 20, 30, 40]);
    assert.deepEqual(img.getPixel(0, 1), [0, 0, 0, 0]);
    assert.deepEqual(img.getPixel(2, 1), [0, 0, 0, 0]);
    assert.deepEqual(img.getPixel(1, 0), [0, 0, 0, 0]);
    assert.deepEqual(img.getPixel(1, 2), [0, 0, 0, 0]);
}

// выход за границы бросает RangeError
{
    const img = new FlatArrayImgProcessor(2, 2);
    assert.throws(() => img.getPixel(2, 0), RangeError);
    assert.throws(() => img.getPixel(0, 2), RangeError);
    assert.throws(() => img.setPixel(5, 0, [1, 2, 3, 4]), RangeError);
}

// отрицательные координаты бросают RangeError
{
    const img = new FlatArrayImgProcessor(3, 3);
    assert.throws(() => img.getPixel(-1, 0), RangeError);
    assert.throws(() => img.getPixel(0, -1), RangeError);
    assert.throws(() => img.getPixel(-1, -1), RangeError);
    assert.throws(() => img.setPixel(-1, 0, [1, 2, 3, 4]), RangeError);
    assert.throws(() => img.setPixel(0, -1, [1, 2, 3, 4]), RangeError);
}

// forEach RowMajor обходит пиксели построчно
{
    const img = new FlatArrayImgProcessor(2, 2);
    img.setPixel(0, 0, [1, 0, 0, 0]);
    img.setPixel(1, 0, [2, 0, 0, 0]);
    img.setPixel(0, 1, [3, 0, 0, 0]);
    img.setPixel(1, 1, [4, 0, 0, 0]);

    const visited: Array<{ rgba: [number, number, number, number]; x: number; y: number }> = [];
    img.forEach(TraverseMode.RowMajor, (rgba, x, y) => visited.push({ rgba: rgba as [number, number, number, number], x, y }));

    assert.equal(visited.length, 4);
    assert.deepEqual(visited[0], { rgba: [1, 0, 0, 0], x: 0, y: 0 });
    assert.deepEqual(visited[1], { rgba: [2, 0, 0, 0], x: 1, y: 0 });
    assert.deepEqual(visited[2], { rgba: [3, 0, 0, 0], x: 0, y: 1 });
    assert.deepEqual(visited[3], { rgba: [4, 0, 0, 0], x: 1, y: 1 });
}

// forEach ColMajor обходит пиксели по столбцам
{
    const img = new FlatArrayImgProcessor(2, 2);
    img.setPixel(0, 0, [1, 0, 0, 0]);
    img.setPixel(1, 0, [2, 0, 0, 0]);
    img.setPixel(0, 1, [3, 0, 0, 0]);
    img.setPixel(1, 1, [4, 0, 0, 0]);

    const visited: Array<{ x: number; y: number }> = [];
    img.forEach(TraverseMode.ColMajor, (_rgba, x, y) => visited.push({ x, y }));

    assert.equal(visited.length, 4);
    assert.deepEqual(visited[0], { x: 0, y: 0 });
    assert.deepEqual(visited[1], { x: 0, y: 1 });
    assert.deepEqual(visited[2], { x: 1, y: 0 });
    assert.deepEqual(visited[3], { x: 1, y: 1 });
}

console.log('solution_flat-array: все тесты прошли');
