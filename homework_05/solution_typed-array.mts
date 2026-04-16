type RGBA = [red: number, green: number, blue: number, alpha: number];

export enum TraverseMode {
   RowMajor,
   ColMajor
}

interface PixelStream {
    getPixel(x: number, y: number): RGBA;
    setPixel(x: number, y: number, rgba: RGBA): RGBA;
    forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void;
}

export class TypedArrayImgProcessor implements PixelStream {
    private static PIXEL_DATA_LENGTH: number = 4;

    private buffer: Uint8Array;

    private width: number;

    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.buffer = new Uint8Array(width * height * TypedArrayImgProcessor.PIXEL_DATA_LENGTH);
    }

    private getPixelIndex(x: number, y: number): number {
        const {width, height} = this;
        
        if (x < 0 || y < 0 || x >= width || y >= height) {
            throw new RangeError('Pixel is out the image bounds');
        }

        return (x + y * width) * TypedArrayImgProcessor.PIXEL_DATA_LENGTH;
    }

    private readPixel(index: number): RGBA {
        return [
            this.buffer[index],
            this.buffer[index + 1],
            this.buffer[index + 2],
            this.buffer[index + 3],
        ] as RGBA;
    }

    public get size(): [number, number] {
        return [this.width, this.height];
    }

    public getPixel(x: number, y: number): RGBA {
        return this.readPixel(this.getPixelIndex(x, y));
    }

    public setPixel(x: number, y: number, rgba: RGBA): RGBA {
        const index = this.getPixelIndex(x, y);

        this.buffer[index] = rgba[0];
        this.buffer[index + 1] = rgba[1];
        this.buffer[index + 2] = rgba[2];
        this.buffer[index + 3] = rgba[3];

        return rgba;
    }

    public forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void {
        const {width, height} = this;

        let x = 0;
        let y = 0;
        let idx = 0;

        if (mode === TraverseMode.RowMajor) {
            while (y < height) {
                callback(this.readPixel(idx), x, y);

                idx += TypedArrayImgProcessor.PIXEL_DATA_LENGTH;
                x += 1;

                if (x >= width) {
                    x = 0;
                    y += 1;
                }
            }

            return;
        } 
        
        while (x < width) {
            callback(this.readPixel(idx), x, y);

            idx += width * TypedArrayImgProcessor.PIXEL_DATA_LENGTH;
            y += 1;

            if (y >= height) {
                y = 0;
                x += 1;
                idx = x * TypedArrayImgProcessor.PIXEL_DATA_LENGTH;
            }
        }        
    }
}
