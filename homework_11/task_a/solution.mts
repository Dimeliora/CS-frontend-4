type StackPointerOptions = {
    buffer: Uint8Array;
    pointer: number;
    capacity: number;
};

type HeapPointerOptions = StackPointerOptions & {
    dealloc: () => void;
};

type MemoryOptions = {
    stack: number;
};

type FourBytes = [number, number, number, number];

type ReallocateFn = (ptr: number) => void;

const REALLOC_HEAP_PTR_SYMBOL = Symbol('realloc_heap_ptr');

class StackPointer {
    #buffer: Uint8Array;

    #pointer: number;

    #capacity: number;

    constructor({buffer, pointer, capacity}: StackPointerOptions) {
        this.#buffer = buffer;
        this.#pointer = pointer;
        this.#capacity = capacity;
    }

    public deref(): ArrayBuffer {
        return this.#buffer.slice(this.#pointer, this.#pointer + this.#capacity).buffer;
    }

    public change(bytes: ArrayBuffer): void {
        // Не будем расширяться, двигая всё подряд на стеке...
        if (bytes.byteLength > this.#capacity) {
            throw new Error('Frame capacity is not enough to write the passed data');
        }

        // Если новый буфер меньше, в оставшиеся байты запишем нули
        const bytesToSet = new Uint8Array(this.#capacity);

        bytesToSet.set(new Uint8Array(bytes));
        this.#buffer.set(bytesToSet, this.#pointer);
    }
}

class HeapPointer {
    #buffer: Uint8Array;

    #pointer: number;

    #capacity: number;

    #freed: boolean = false;

    #dealloc: (() => void) | null;

    constructor({buffer, pointer, capacity, dealloc}: HeapPointerOptions) {
        this.#buffer = buffer;
        this.#pointer = pointer;
        this.#capacity = capacity;
        this.#dealloc = dealloc;
    }

    public deref(): ArrayBuffer {
        if (this.#freed) {
            throw new Error('Allocated memory is already freed');
        }

        return this.#buffer.slice(this.#pointer, this.#pointer + this.#capacity).buffer;
    }

    public change(bytes: ArrayBuffer): void {
        if (this.#freed) {
            throw new Error('Allocated memory is already freed');
        }

        // Выделенную область не расширяем
        if (bytes.byteLength > this.#capacity) {
            throw new Error(
                `Passed data does not fit into the capacity of the allocated memory. Passed: ${bytes.byteLength}, capacity: ${this.#capacity}`,
            );
        }

        // Если новый буфер меньше, в оставшиеся байты запишем нули
        const bytesToSet = new Uint8Array(this.#capacity);

        bytesToSet.set(new Uint8Array(bytes));
        this.#buffer.set(bytesToSet, this.#pointer);
    }

    public free(): void {
        if (this.#freed) {
            throw new Error('Allocated memory is already freed');
        }

        this.#dealloc?.();
        this.#freed = true;
        this.#dealloc = null;
    }

    public [REALLOC_HEAP_PTR_SYMBOL](ptr: number): void {
        this.#pointer = ptr;
    }
}

export class Memory {
    // Указатель на начало предшествующего кадра стека, возьмём 4 байта, с запасом
    static readonly PTR_SIZE: number = 4;

    #buffer: Uint8Array;

    // `pointer => revoker`, отзыв proxy указателя как защита от UB (состояние в самом указателе на стековый кадр не храним)
    #frameRevokers: Map<number, () => void> = new Map();
    
    // `pointer => [capacity, reallocate]`, для удобства перераспределения внутри кучи, если нужно дефрагментировать
    // Хак среднего уровня грязи - сортировка index-like ключей объекта стандартизирована спецификацией
    #heapAllocations: Record<number, [number, ReallocateFn]> = Object.create(null);

    #totalSize: number;

    #stackSize: number;

    #stackTopPtr: number = 0;

    #stackTopFramePtr: number = 0;

    constructor(size: number, {stack}: MemoryOptions) {
        if (stack > size) {
            throw new RangeError('Stack size should be less or equal the total size');
        }

        this.#totalSize = size;
        this.#stackSize = stack;

        this.#buffer = new Uint8Array(size);
    }

    public get totalCapacity(): number {
        return this.#totalSize;
    }

    public get stackCapacity(): number {
        return this.#stackSize;
    }

    public get heapCapacity(): number {
        return this.#totalSize - this.#stackSize;
    }

    public push(buffer: ArrayBuffer): StackPointer {
        const bytesLengthToSet = buffer.byteLength + Memory.PTR_SIZE;
        const bytesLengthLeft = this.#stackSize - this.#stackTopPtr;

        if (bytesLengthToSet > bytesLengthLeft) {
            throw new Error('Maximum stack size exceeded');
        }

        this.#buffer.set(new Uint8Array(buffer), this.#stackTopPtr);

        // Кладём указатель на предшественника в кадр сразу за данными (попытка в канон)
        // Теряем 4 байта на бесполезный указатель у первого элемента, но уже не стал возиться...
        this.#buffer.set(this.#packRawStackPointer(this.#stackTopFramePtr), this.#stackTopPtr + buffer.byteLength);

        // Вариант защиты от UB при попытке воспользоваться API указателя на уже снятый со стека кадр
        const [pointer, revoke] = this.#wrapStackPointerWithProxy(
            new StackPointer({
                buffer: this.#buffer,
                pointer: this.#stackTopPtr,
                capacity: buffer.byteLength,
            }),
        );

        this.#frameRevokers.set(this.#stackTopPtr, revoke);
        
        this.#stackTopFramePtr = this.#stackTopPtr;
        this.#stackTopPtr += (buffer.byteLength + Memory.PTR_SIZE);
        
        return pointer;
    }

    public pop(): ArrayBuffer | undefined {
        if (this.#stackTopPtr === 0) {
            return;
        }

        const data = this.#buffer.slice(this.#stackTopFramePtr, this.#stackTopPtr - Memory.PTR_SIZE);

        const stackTopFramePtr = this.#unpackRawStackPointer(
            this.#buffer.subarray(this.#stackTopPtr - Memory.PTR_SIZE, this.#stackTopPtr)
        );

        this.#frameRevokers.get(this.#stackTopFramePtr)?.();
        this.#frameRevokers.delete(this.#stackTopFramePtr);
        
        this.#stackTopPtr = this.#stackTopFramePtr;
        this.#stackTopFramePtr = stackTopFramePtr;

        return data.buffer;
    }

    public alloc(length: number): HeapPointer {
        const ptr = this.#getRawHeapPointer(length);
        
        const pointer = new HeapPointer({
            buffer: this.#buffer,
            capacity: length,
            pointer: ptr,
            dealloc: () => delete this.#heapAllocations[ptr],
        });

        const realloc = pointer[REALLOC_HEAP_PTR_SYMBOL].bind(pointer);

        this.#heapAllocations[ptr] = [length, realloc];

        return pointer;
    }

    #packRawStackPointer(ptr: number): FourBytes {
        const packed = [0, 0, 0, 0] satisfies FourBytes;

        let curr = ptr;
        let idx = packed.length - 1;

        do {
            packed[idx] = curr % (0xFF + 1);
            curr = Math.floor(curr / (0xFF + 1));
            idx -= 1;
        } while (curr > 0 || idx >= 0);

        return packed;
    }

    #unpackRawStackPointer(packed: Uint8Array): number {
        let value = 0;        

        for (let i = Memory.PTR_SIZE - 1; i >= 0; i -= 1) {
            value += packed[i]! * (0xFF + 1) ** (Memory.PTR_SIZE - 1 - i);
        }

        return value;
    }

    #wrapStackPointerWithProxy(pointer: StackPointer): [StackPointer, () => void] {
        const {proxy, revoke} = Proxy.revocable(
            pointer,
            {
                get(trg, prop) {
                    const value = Reflect.get(trg, prop, trg);
                    return typeof value === 'function' ? value.bind(trg) : value;
                }
            },
        );

        return [proxy, revoke];
    }

    #getRawHeapPointer(length: number): number {
        const {heapCapacity} = this;
        const heapBottom = this.#stackSize;
        const heapTop = this.#totalSize;

        if (Object.keys(this.#heapAllocations).length === 0) {
            if (length > heapCapacity) {
                throw new Error('Heap capacity is not enough to write the passed data');
            }

            return heapBottom;
        }

        const allocatedHeapPointers = Object.keys(this.#heapAllocations).map((ptr) => Number.parseInt(ptr));        

        // Ищем на куче ближайшую свободную область подходящего размера
        for (let i = 0; i < allocatedHeapPointers.length; i += 1) {
            const currPtr = allocatedHeapPointers[i]!;
            const currLen = this.#heapAllocations[currPtr]![0];

            // Частный случай - область в начале кучи была ранее освобождена
            if (i === 0 && currPtr !== heapBottom) {
                if (length <= currPtr - heapBottom) {
                    return heapBottom;
                }
            }

            const isLast = i === allocatedHeapPointers.length - 1;
            const nearest = isLast ? heapTop : allocatedHeapPointers[i + 1]!;
            const nextToCurrPtr = currPtr + currLen;
            
            if (
                nextToCurrPtr !== nearest &&
                length <= nearest - nextToCurrPtr
            ) {
                return nextToCurrPtr;
            }
        }

        // Если достаточная для выделения область не нашлась, реаллоцируем все указатели ("дефрагментирование")
        this.#defragHeap(allocatedHeapPointers);
        
        // Если после "дефрагментирования" в конце осталась область достаточного размера - выделяем память в ней
        const lastPtr = Number.parseInt(Object.keys(this.#heapAllocations).at(-1)!);
        const lastLen = this.#heapAllocations[lastPtr]![0];
        const nextToLastPtr = lastPtr + lastLen;

        if (length <= heapTop - nextToLastPtr) {
            return nextToLastPtr;
        }

        // Такова се ля ва...
        throw new Error('Heap capacity is not enough to write the passed data');
    }

    #defragHeap(pointers: number[]): void {
        const heapBottom = this.#stackSize;

        for (let i = 0; i < pointers.length - 1; i += 1) {            
            let currPtr = pointers[i]!;
            const currLen = this.#heapAllocations[currPtr]![0];
            const currRealloc = this.#heapAllocations[currPtr]![1];

            // Частный случай - начало кучи было высвобождено
            if (i === 0 && currPtr !== heapBottom) {
                this.#buffer.set(this.#buffer.subarray(currPtr, currPtr + currLen), heapBottom);

                this.#heapAllocations[heapBottom] = this.#heapAllocations[currPtr]!;
                delete this.#heapAllocations[currPtr];

                currPtr = heapBottom;
                currRealloc(currPtr);
            }

            const nearestPtr = pointers[i + 1]!;
            const nearestLen = this.#heapAllocations[nearestPtr]![0];
            const nearestRealloc = this.#heapAllocations[nearestPtr]![1];

            const nextToCurrPtr = currPtr + currLen;

            if (nearestPtr !== nextToCurrPtr) {               
                this.#buffer.set(this.#buffer.subarray(nearestPtr, nearestPtr + nearestLen), nextToCurrPtr);

                this.#heapAllocations[nextToCurrPtr] = this.#heapAllocations[nearestPtr]!;
                delete this.#heapAllocations[nearestPtr];

                nearestRealloc(nextToCurrPtr);
            }
        }
    }
}
