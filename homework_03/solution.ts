class BCD8421 {
    private digits: number;
    
    private buffer: Uint8Array;

    constructor(val: number | bigint) {
        if (val < 0) {
            throw new RangeError('Non-negative number expected');
        }

        this.digits = this.getDigitsCount(val);
        
        this.buffer = new Uint8Array(this.digits);

        for (
            let i = this.digits - 1, curr = val;
            i >= 0;
            i -= 1, curr = typeof curr === 'bigint' ? curr / 10n : Math.floor(curr / 10)
        ) {
            this.buffer[i] = Number(curr) % 10;
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
            bigint = bigint * 10n + BigInt(byte);
        }

        return bigint;
    }

    public toNumber(): number {
        let number = 0;

        for (const byte of this.buffer) {
            number = number * 10 + byte;
        }

        return number;
    }

    public toString(): string {
        let str = '';

        for (const [idx, byte] of this.buffer.entries()) {
            str = (idx === 0 ? str : str + '_') + byte.toString(2).padStart(8, '0');
        }

        return str;
    }

    public at(index: number): number | undefined {
        return this.buffer.at(index);
    }
}

const bcd = new BCD8421(12345n);

console.log(bcd.toBigint());
console.log(bcd.toNumber());
console.log(bcd.toString());

console.log(bcd.at(0));
console.log(bcd.at(1));

console.log(bcd.at(-1));
console.log(bcd.at(-2));
