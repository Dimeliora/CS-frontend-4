# Реализация потока RGBA пикселей

> Цель задания: понять, как представление данных в памяти и паттерн доступа влияют на производительность.

> Вы увидите, что даже в высокоуровневом JavaScript неправильная структура данных может драматически повлиять на производительность — и почему это происходит.

Реализуйте интерфейс `PixelStream` с четырьмя разными внутренними представлениями данных и исследуйте влияние на производительность. Напишите бенчмарки для изображений с разным разрешением.

```typescript
type RGBA = [red: number, green: number, blue: number, alpha: number];

enum TraverseMode {
   RowMajor,
   ColMajor
}

interface PixelStream {
    getPixel(x: number, y: number): RGBA;
    setPixel(x: number, y: number, rgba: RGBA): RGBA;
    forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void;
}
```

## Варианты представления данных

| Тип                  | Описание                                  |
| -------------------- | ----------------------------------------- |
| **flat-array**       | Один `Array` чисел длины `width*height*4` |
| **array-of-arrays**  | Массив массивов: `[[r,g,b,a], ...]`       |
| **array-of-objects** | Массив объектов: `[{r,g,b,a}, ...]`       |
| **typed-array**      | Один `Uint8Array` длины `width*height*4`  |
