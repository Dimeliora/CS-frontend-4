export class StringsBufferImp {
    static LENGTH: number = 4;

    static POINTER: number = 4;

    /**
     * Возвращает указатели для получения length/pointer значения по индексу.
     * 
     * Формат - кортеж `[lenStart, ptrStart, ptrEnd]`.
     * 
     * @example
     * [..., n,  0,   0,   0,   3,   0,   0,   0,   32, m ...]
     *           |                   |                  |
     *           lenStart            ptrStart           ptrEnd
     */
    private static getMetaBoundsByIdx(index: number): [number, number, number] {
        const lenStart = index * (StringsBufferImp.LENGTH + StringsBufferImp.POINTER);
        const ptrStart = lenStart + StringsBufferImp.LENGTH;
        const ptrEnd = ptrStart + StringsBufferImp.POINTER;

        return [lenStart, ptrStart, ptrEnd];
    }

    /**
     * Упаковывает значение в 4 байта, возвращая буфер `Uint8Array`
     */
    private static packUint32(value: number): Uint8Array {
        const bytes = new Uint8Array(4);

        let curr = value;

        for (let i = bytes.byteLength - 1; i >= 0; i -= 1) {
            bytes[i] = curr % (0xFF + 1);
            curr = Math.floor(curr / (0xFF + 1));
        }

        return bytes;
    }

    /**
     * Распаковывает 4 байта из переданного буфера `Uint8Array`, возвращая число
     */
    private static unpackUint32(bytes: Uint8Array): number {
        let value = 0;
        let pow = 0;

        for (let i = bytes.byteLength - 1; i >= 0; i -= 1) {
            value += (bytes[i] ?? 0) * (0xFF + 1) ** pow;
            pow += 1;
        }

        return value;
    }

    private buffer: Uint8Array;

    private decoder: TextDecoder;

    private encoder: TextEncoder;

    private _size: number;

    constructor(strings: string[]) {
        this._size = strings.length;

        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();

        this.buffer = this.createBuffer(strings);
    }

    public get size(): number {
        return this._size;
    }

    private createBuffer(strings: string[]): Uint8Array {
        const stringBuffers = strings.map((str) => this.encoder.encode(str));
        const bufferCapacity = stringBuffers.reduce((bytes, buff) => 
            bytes + StringsBufferImp.LENGTH + StringsBufferImp.POINTER + buff.byteLength,
            0
        );

        const buffer = new Uint8Array(bufferCapacity);

        let metaTail = 0;
        let dataTail = this._size * (StringsBufferImp.LENGTH + StringsBufferImp.POINTER);

        for (const buff of stringBuffers) {
            buffer.set(StringsBufferImp.packUint32(buff.byteLength), metaTail);
            buffer.set(StringsBufferImp.packUint32(dataTail), metaTail + StringsBufferImp.LENGTH);
            buffer.set(buff, dataTail);

            metaTail += StringsBufferImp.LENGTH + StringsBufferImp.POINTER;
            dataTail += buff.byteLength;
        }
        
        return buffer;
    }

    private extractValue(from: number, to: number): number {
        return StringsBufferImp.unpackUint32(this.buffer.subarray(from, to));
    }

    public at(index: number): string | undefined {
        const normalizedIndex = index < 0 ? index + this.size : index;

        if (normalizedIndex < 0 || normalizedIndex >= this.size) {
            return;
        }
        
        const [lenStart, ptrStart, ptrEnd] = StringsBufferImp.getMetaBoundsByIdx(normalizedIndex);

        const len = this.extractValue(lenStart, ptrStart);
        const ptr = this.extractValue(ptrStart, ptrEnd);
        
        if (len === 0) {
            return '';
        }

        return this.decoder.decode(this.buffer.subarray(ptr, ptr + len));
    }

    /**
     * Установка новой строки по индексу.
     * 
     * Если новая строка той же длины (в байтах) или меньше, она кладётся на место старой,
     * при этом потенциально бесхозные байты остаются как есть (они недоступны через публичный API).
     * 
     * Если новая строка большей длины, исходный буфер расширяется недостающим количеством байтов,
     * все строки, следующие после, смещаются на дельту длины, обновляются их указатели.
     */
    public set(index: number, value: string): void {
        const normalizedIndex = index < 0 ? index + this.size : index;

        if (normalizedIndex < 0 || normalizedIndex >= this.size) {
            throw new RangeError('Index is out of range');
        }

        const valueBytes = this.encoder.encode(value);

        const [oldLenStart, oldPtrStart, oldPtrEnd] = StringsBufferImp.getMetaBoundsByIdx(normalizedIndex);

        const oldLen = this.extractValue(oldLenStart, oldPtrStart);
        const oldPtr = this.extractValue(oldPtrStart, oldPtrEnd);

        // Для меньших длин оставляем бесхозные байты
        // Можно было бы сделать shrink, на каждое изменение или эвристически (например, следить за относительным числом "дырок")
        if (valueBytes.byteLength <= oldLen) {
            this.buffer.set(StringsBufferImp.packUint32(valueBytes.byteLength), oldLenStart);
            this.buffer.set(StringsBufferImp.packUint32(oldPtr), oldPtrStart);
            this.buffer.set(valueBytes, oldPtr);

            return;
        }

        const bytesToExtend = valueBytes.byteLength - oldLen;
        const extendedBuffer = new Uint8Array(this.buffer.byteLength + bytesToExtend);

        // Копирование упрощено, можно было бы переложить явно циклом только то, что лежит до индекса
        extendedBuffer.set(this.buffer);

        // Кладём мету и байты новой строки
        extendedBuffer.set(StringsBufferImp.packUint32(valueBytes.byteLength), oldLenStart);
        extendedBuffer.set(StringsBufferImp.packUint32(oldPtr), oldPtrStart);
        extendedBuffer.set(valueBytes, oldPtr);

        // Всё, что осталось после двигаем на образовавшуюся дельту, обновляем указатели
        for (let i = normalizedIndex + 1; i < this._size; i += 1) {
            const [letStart, ptrStart, ptrEnd] = StringsBufferImp.getMetaBoundsByIdx(i);

            const len = this.extractValue(letStart, ptrStart);
            const ptr = this.extractValue(ptrStart, ptrEnd);
            extendedBuffer.set(StringsBufferImp.packUint32(ptr + bytesToExtend), ptrStart);

            extendedBuffer.set(this.buffer.subarray(ptr, ptr + len), ptr + bytesToExtend);
        }

        this.buffer = extendedBuffer;
    }

    public [Symbol.iterator](): IterableIterator<string> {
        let curr = 0;

        return {
            [Symbol.iterator](): IterableIterator<string> {
                return this;
            },
            next: (): IteratorResult<string> => {
                const value = this.at(curr);

                if (curr === this.size || value == null) {
                    return {done: true, value: undefined};
                }

                curr += 1;

                return {done: false, value};
            }
        }
    }

    public values(): IterableIterator<string> {
        return this[Symbol.iterator]();
    }

    public entries(): IterableIterator<[number, string]> {
        let curr = 0;

        return {
            [Symbol.iterator](): IterableIterator<[number, string]> {
                return this;
            },
            next: (): IteratorResult<[number, string]> => {
                const value = this.at(curr);

                if (curr === this.size || value == null) {
                    return {done: true, value: undefined};
                }

                return {done: false, value: [curr++, value]};
            }
        }
    }
}

export function encodeStrings(strings: string[]): StringsBufferImp {
    return new StringsBufferImp(strings);
}

export function decodeStrings(buffer: StringsBufferImp): string[] {
    return [...buffer];
}
