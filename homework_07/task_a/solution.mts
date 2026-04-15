export class StringsBuffer {
    static LENGTH: number = 4;

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

    constructor(strings: string[]) {
        this.decoder = new TextDecoder();

        this.buffer = this.createBuffer(strings);
    }

    public get size(): number {
        return StringsBuffer.unpackUint32(this.buffer.subarray(0, StringsBuffer.LENGTH));
    }

    private createBuffer(strings: string[]): Uint8Array {
        const encoder = new TextEncoder();

        const stringBuffers = strings.map((str) => encoder.encode(str));
        const bufferCapacity = stringBuffers.reduce((bytes, buff) => 
            bytes + StringsBuffer.LENGTH + buff.byteLength,
            StringsBuffer.LENGTH
        );

        const buffer = new Uint8Array(bufferCapacity);

        buffer.set(StringsBuffer.packUint32(strings.length));

        let tail = StringsBuffer.LENGTH;

        for (const buff of stringBuffers) {
            buffer.set(StringsBuffer.packUint32(buff.byteLength), tail);
            buffer.set(buff, tail + StringsBuffer.LENGTH);

            tail += StringsBuffer.LENGTH + buff.byteLength;
        }

        return buffer;
    }

    public at(index: number): string | undefined {
        const normalizedIndex = index < 0 ? index + this.size : index;

        if (normalizedIndex < 0 || normalizedIndex >= this.size) {
            return;
        }

        let currStrLen: number | undefined;
        let currStrBytes: Uint8Array<ArrayBufferLike> | undefined;
        let currIdx = normalizedIndex;
        let tail = StringsBuffer.LENGTH;
        
        do {
            let currStrLenBytes = this.buffer.subarray(tail, tail + StringsBuffer.LENGTH);
            
            if (currStrLenBytes.byteLength !== StringsBuffer.LENGTH) {
                return;
            }

            currStrLen = StringsBuffer.unpackUint32(currStrLenBytes);
            currStrBytes = this.buffer.subarray(tail + StringsBuffer.LENGTH, tail + StringsBuffer.LENGTH + currStrLen);
            tail += StringsBuffer.LENGTH + currStrBytes.byteLength;
            currIdx -= 1;
        } while (currIdx >= 0);

        if (currStrLen === 0) {
            return '';
        }

        return this.decoder.decode(currStrBytes);
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

export function encodeStrings(strings: string[]): StringsBuffer {
    return new StringsBuffer(strings);
}

export function decodeStrings(buffer: StringsBuffer): string[] {
    return [...buffer];
}
