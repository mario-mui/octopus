/* Ported verbatim from the console `@topology` lib (geom/Dimensions.ts). */
import { DimensionsIface } from './types';

export default class Dimensions implements DimensionsIface {
  static readonly EMPTY = new Dimensions();

  width: number = 0;

  height: number = 0;

  static fromDimensions(dimension: DimensionsIface): Dimensions {
    return new Dimensions(dimension.width, dimension.height);
  }

  constructor(width: number = 0, height: number = 0) {
    this.width = width;
    this.height = height;
  }

  isEmpty(): boolean {
    return this.width <= 0 || this.height <= 0;
  }

  setSize(w: number, h: number): Dimensions {
    this.width = w;
    this.height = h;
    return this;
  }

  clone(): Dimensions {
    return Dimensions.fromDimensions(this);
  }

  equals(r: DimensionsIface) {
    return r.width === this.width && r.height === this.height;
  }
}
