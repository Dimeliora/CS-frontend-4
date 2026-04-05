class BCD8421 {
    private digits: number;

    private buffer: Uint8Array;

    private static getLowerNibble(byte: number): number {
        return byte & 0xF;
    }

    private static getHigherNibble(byte: number): number {
        return (byte & 0xF0) >>> 4;
    }
    
    constructor(val: number | bigint) {
        if (val < 0) {
            throw new RangeError('Non-negative number expected');
        }

        this.digits = this.getDigitsCount(val);

        this.buffer = new Uint8Array(Math.ceil(this.digits / 2));

        // Начинаем с 0, так будет проще понимать, старший или младший ниббл пишем (через чётность `idx`)
        let idx = 0;
        let bufferIdx = this.buffer.length - 1;
        let curr = val;

        while (idx < this.digits) {
            const digit = (Number(curr) % 10);
            // `??` - для TS
            const storedByte = this.buffer[bufferIdx] ?? 0;

            // `idx % 2 === 0` - младший ниббл, иначе старший
            this.buffer[bufferIdx] = idx % 2 === 0 ? digit : (storedByte | digit << 4);

            idx += 1;
            curr = typeof curr === 'bigint' ? curr / 10n : Math.floor(curr / 10);
            // Индекс для буфера меняем вдвое реже
            bufferIdx -= idx % 2 === 0 ? 1 : 0;
        }      
    }

    private getDigitsCount(val: number | bigint): number {
        let digits = 0;
        let curr = val;

        do {
            curr = typeof curr === 'bigint' ? curr / 10n : Math.floor(curr / 10);
            digits += 1;
        } while (curr > 0);

        return digits;
    }

    public toBigint(): bigint {
        let bigint = 0n;

        for (const byte of this.buffer) {
            bigint = bigint * 10n + BigInt(BCD8421.getHigherNibble(byte));
            bigint = bigint * 10n + BigInt(BCD8421.getLowerNibble(byte));
        }

        return bigint;
    }

    public toNumber(): number {
        let number = 0;

        for (const byte of this.buffer) {
            number = number * 10 + BCD8421.getHigherNibble(byte);
            number = number * 10 + BCD8421.getLowerNibble(byte);
        }

        return number;
    }

    public toString(): string {
        let str = '';

        for (const [idx, byte] of this.buffer.entries()) {
            const strByte = byte.toString(2).padStart(8, '0').match(/\d{4}/g)!.join('_');
            str = (idx === 0 ? str : str + '_') + strByte;
        }

        return str;
    }

    public at(index: number): number | undefined {
        // Знаем разрядность числа, сразу можем отсечь индексы "out of range"
        if ((index > this.digits - 1) || (index < 0 && Math.abs(index) > this.digits)) {
            return;
        }

        // Доступ "с обратной стороны" преобразуем в прямой
        const normalizedIndex = index >= 0 ? index : this.digits - Math.abs(index); 

        // Заполнен ли старший ниббл первого байта (`??` - для TS)
        const isFirstByteFull = BCD8421.getHigherNibble((this.buffer[0] ?? 0)) > 0;

        // Указывает ли индекс на младший ниббл байта
        const isPointingToLower = isFirstByteFull ? normalizedIndex % 2 > 0 : normalizedIndex % 2 === 0;

        let bufferIdx = Math.floor(normalizedIndex / 2);

        if (!isFirstByteFull && !isPointingToLower) {
            bufferIdx += 1;
        }

        const byte = this.buffer[bufferIdx];

        if (byte == null) {
            return;
        }

        return isPointingToLower ? BCD8421.getLowerNibble(byte) : BCD8421.getHigherNibble(byte);
    }
}

const bcd = new BCD8421(12345n);

console.log(bcd.toString());
console.log(bcd.toNumber());
console.log(bcd.toBigint());

console.log('Moving forward');
const forwardIndices = [0, 1, 2, 3, 4, 5];
for (let i = 0; i < forwardIndices.length; i += 1) console.log(bcd.at(forwardIndices[i]!));

console.log('Moving backward');
const backwardIndices = [-1, -2, -3, -4, -5, -6];
for (let i = 0; i < backwardIndices.length; i += 1) console.log(bcd.at(backwardIndices[i]!));
