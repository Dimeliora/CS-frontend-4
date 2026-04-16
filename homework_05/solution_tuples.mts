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

export class TuplesImgProcessor implements PixelStream {
    private buffer: RGBA[];

    private width: number;

    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.buffer = Array.from({length: width * height}, () => [0, 0, 0, 0])
    }

    private getPixelIndex(x: number, y: number): number {
        const {width, height} = this;
        
        if (x < 0 || y < 0 || x >= width || y >= height) {
            throw new RangeError('Pixel is out the image bounds');
        }

        return x + y * width;
    }

    private readPixel(index: number): RGBA {
        const pixel = this.buffer.at(index) as RGBA;
        return [pixel[0], pixel[1], pixel[2], pixel[3]];
    }

    public get size(): [number, number] {
        return [this.width, this.height];
    }

    public getPixel(x: number, y: number): RGBA {
        return this.readPixel(this.getPixelIndex(x, y));
    }

    public setPixel(x: number, y: number, rgba: RGBA): RGBA {
        const pixel = this.buffer[this.getPixelIndex(x, y)] as RGBA;

        pixel[0] = rgba[0];
        pixel[1] = rgba[1];
        pixel[2] = rgba[2];
        pixel[3] = rgba[3];

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
            callback(this.readPixel(idx), x, y);

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
