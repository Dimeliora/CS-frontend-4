export class FreeShiftableArray {
    buffer;

    head = 0;

    tail = 0;

    _size = 0;

    _capacity = 0;

    constructor(capacity) {
        if (capacity != null && capacity <= 0) {
            throw new RangeError('Positive capacity value expected');
        }
        
        this._capacity = capacity ?? 1;

        this.buffer = Array.from({length: this._capacity});
    }

    get size() {
        return this._size;
    }

    get capacity() {
        return this._capacity;
    }

    get isEmpty() {
        return this._size === 0;
    }

    get isFull() {
        return this._size === this._capacity;
    }

    extend() {
        const extendedCapacity = this._capacity * 2;
        const extendedBuffer = Array.from({length: extendedCapacity});

        for (let idx = 0; idx < this._capacity; idx += 1) {
            extendedBuffer[idx] = this.at(idx);
        }

        this.head = 0;
        this.tail = this._capacity;
        this._capacity = extendedCapacity;
        this.buffer = extendedBuffer;
    }

    push(el) {
        if (this.isFull) {
            this.extend();
        }

        this.buffer[this.tail] = el;
        this.tail = (this.tail + 1) % this._capacity;
        this._size += 1;

        return this._size;
    }

    pop() {
        if (this.isEmpty) {
            return;
        }

        this.tail = (this.tail - 1 + this._capacity) % this._capacity;
        this._size -= 1;

        const value = this.buffer[this.tail];

        this.buffer[this.tail] = undefined;

        return value;
    }

    unshift(el) {
        if (this.isFull) {
            this.extend();
        }

        this.head = (this.head - 1 + this._capacity) % this._capacity;
        this.buffer[this.head] = el;
        this._size += 1;

        return this._size;
    }

    shift() {
        if (this.isEmpty) {
            return;
        }

        const value = this.buffer[this.head];

        this.buffer[this.head] = undefined;
        this.head = (this.head + 1 + this._capacity) % this._capacity;
        this._size -= 1;

        return value;
    }

    at(index) {
        return this.buffer[(this.head + index) % this._capacity];
    }

    [Symbol.iterator]() {
        let curr = 0;

        return {
            [Symbol.iterator]() {
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

    values() {
        return this[Symbol.iterator]();
    } 

    entries() {
        let curr = 0;

        return {
            [Symbol.iterator]() {
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
