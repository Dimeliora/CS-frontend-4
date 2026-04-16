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

type Pixel = {
    r: number;
    g: number;
    b: number;
    a: number;
}

export class ObjectsImgProcessor implements PixelStream {
    private buffer: Pixel[];

    private width: number;

    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.buffer = Array.from({length: width * height}, () => ({r: 0, g: 0, b: 0, a: 0}))
    }

    private getPixelIndex(x: number, y: number): number {
        const {width, height} = this;
        
        if (x < 0 || y < 0 || x >= width || y >= height) {
            throw new RangeError('Pixel is out the image bounds');
        }

        return x + y * width;
    }

    private readPixel(index: number): Pixel {
        return this.buffer[index] as Pixel;
    }

    public get size(): [number, number] {
        return [this.width, this.height];
    }

    public getPixel(x: number, y: number): RGBA {
        const {r, g, b, a} = this.readPixel(this.getPixelIndex(x, y));
        return [r, g, b, a];
    }

    public setPixel(x: number, y: number, rgba: RGBA): RGBA {
        const pixelData = this.buffer[this.getPixelIndex(x, y)] as Pixel;

        pixelData.r = rgba[0];
        pixelData.g = rgba[1];
        pixelData.b = rgba[2];
        pixelData.a = rgba[3];

        return rgba;
    }

    public forEach(mode: TraverseMode, callback: (rgba: RGBA, x: number, y: number) => void): void {
        const {width, height} = this;

        let x = 0;
        let y = 0;
        let idx = 0;

        if (mode === TraverseMode.RowMajor) {
            while (y < height) {
                const {r, g, b, a} = this.readPixel(idx);
                callback([r, g, b, a], x, y);

                idx += 1;
                x += 1;

                if (x >= width) {
                    x = 0;
                    y += 1;
                }
            }

            return;
        }

        while (x < width) {
            const {r, g, b, a} = this.readPixel(idx);
            callback([r, g, b, a], x, y);

            idx += width;
            y += 1;

            if (y >= height) {
                y = 0;
                x += 1;
                idx = x;
            }
        } 
    }
}
