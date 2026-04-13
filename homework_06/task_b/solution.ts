export class FreeShiftableArray<T = unknown> {
    private buffer: Array<T | undefined>;

    private head: number = 0;

    private tail: number = 0;

    private _size: number = 0;

    private _capacity: number = 0;

    constructor(capacity?: number) {
        if (capacity != null && capacity <= 0) {
            throw new RangeError('Positive capacity value expected');
        }
        
        this._capacity = capacity ?? 1;

        this.buffer = Array.from<T | undefined>({length: this._capacity});
    }

    get size(): number {
        return this._size;
    }

    get capacity(): number {
        return this._capacity;
    }

    get isEmpty(): boolean {
        return this._size === 0;
    }

    get isFull(): boolean {
        return this._size === this._capacity;
    }

    private extend(): void {
        const extendedCapacity = this._capacity * 2;
        const extendedBuffer = Array.from<T | undefined>({length: extendedCapacity});

        for (let idx = 0; idx < this._capacity; idx += 1) {
            extendedBuffer[idx] = this.at(idx);
        }

        this.head = 0;
        this.tail = this._capacity;
        this._capacity = extendedCapacity;
        this.buffer = extendedBuffer;
    }

    push(el: T): number {
        if (this.isFull) {
            this.extend();
        }

        this.buffer[this.tail] = el;
        this.tail = (this.tail + 1) % this._capacity;
        this._size += 1;

        return this._size;
    }

    pop(): T | undefined {
        if (this.isEmpty) {
            return;
        }

        this.tail = (this.tail - 1 + this._capacity) % this._capacity;
        this._size -= 1;

        const value = this.buffer[this.tail];

        this.buffer[this.tail] = undefined;

        return value;
    }

    unshift(el: T): number {
        if (this.isFull) {
            this.extend();
        }

        this.head = (this.head - 1 + this._capacity) % this._capacity;
        this.buffer[this.head] = el;
        this._size += 1;

        return this._size;
    }

    shift(): T | undefined {
        if (this.isEmpty) {
            return;
        }

        const value = this.buffer[this.head];

        this.buffer[this.head] = undefined;
        this.head = (this.head + 1 + this._capacity) % this._capacity;
        this._size -= 1;

        return value;
    }

    at(index: number): T | undefined {
        return this.buffer[(this.head + index) % this._capacity];
    }

    [Symbol.iterator](): IterableIterator<T | undefined> {
        let curr = 0;

        return {
            [Symbol.iterator](): IterableIterator<T | undefined> {
                return this;
            },
            next: () => {
                if (curr === this._size) {
                    return {value: undefined, done: true};
                }

                return {value: this.at(curr++), done: false};
            }
        }
    }

    values(): IterableIterator<T | undefined> {
        return this[Symbol.iterator]();
    } 

    entries(): IterableIterator<[number, T | undefined]> {
        let curr = 0;

        return {
            [Symbol.iterator](): IterableIterator<[number, T | undefined]> {
                return this;
            },
            next: () => {
                if (curr === this.size) {
                    return {value: undefined, done: true};
                }

                return {value: [curr, this.at(curr++)], done: false};
            }
        }
    } 
}
