/* Ported verbatim from the console `@topology` lib (geom/Rect.ts). */
import Point from './Point';
import { Padding, RectIface, Translatable } from './types';

export default class Rect implements Translatable, RectIface {
  static readonly EMPTY = new Rect();

  width: number = 0;

  height: number = 0;

  x: number = 0;

  y: number = 0;

  static fromRect(rect: RectIface): Rect {
    return new Rect(rect.x, rect.y, rect.width, rect.height);
  }

  constructor(
    x: number = 0,
    y: number = 0,
    width: number = 0,
    height: number = 0,
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  isEmpty(): boolean {
    return this.width <= 0 || this.height <= 0;
  }

  setLocation(x: number, y: number): Rect {
    this.x = x;
    this.y = y;
    return this;
  }

  setSize(w: number, h: number): Rect {
    this.width = w;
    this.height = h;
    return this;
  }

  translate(dx: number, dy: number): Rect {
    this.x += dx;
    this.y += dy;
    return this;
  }

  getCenter(): Point {
    return new Point(this.x + this.width / 2, this.y + this.height / 2);
  }

  setCenter(x: number, y: number): Rect {
    this.x = x - this.width / 2;
    this.y = y - this.height / 2;
    return this;
  }

  resize(dw: number, dh: number): Rect {
    this.width += dw;
    this.height += dh;
    return this;
  }

  bottom(): number {
    return this.y + this.height;
  }

  right(): number {
    return this.x + this.width;
  }

  union({ x, y, width, height }: RectIface): Rect {
    const right = Math.max(this.x + this.width, x + width);
    const bottom = Math.max(this.y + this.height, y + height);
    this.x = Math.min(this.x, x);
    this.y = Math.min(this.y, y);
    this.width = right - this.x;
    this.height = bottom - this.y;
    return this;
  }

  expand(h: number, v: number): Rect {
    this.y -= v;
    this.height += v * 2;
    this.x -= h;
    this.width += h * 2;
    return this;
  }

  //
  // Padding Format:  [all], [vertical, horizontal], [top, horizontal, bottom], [top, right, bottom, left]
  //
  padding(padding?: Padding): Rect {
    if (padding) {
      if (typeof padding === 'number') {
        this.expand(padding, padding);
      } else if (padding.length === 1) {
        this.expand(padding[0], padding[0]);
      } else if (padding.length === 2) {
        this.expand(padding[1], padding[0]);
      } else if (padding.length === 3) {
        this.y -= padding[0];
        this.height += padding[0] + padding[2];
        this.width += padding[1];
      } else if (padding.length === 4) {
        this.y -= padding[0];
        this.height += padding[0] + padding[2];
        this.x -= padding[1];
        this.width += padding[1] + padding[3];
      }
    }
    return this;
  }

  setBounds(x: number, y: number, width: number, height: number): Rect {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    return this;
  }

  clone(): Rect {
    return Rect.fromRect(this);
  }

  equals(r: RectIface) {
    return (
      r.x === this.x &&
      r.y === this.y &&
      r.width === this.width &&
      r.height === this.height
    );
  }
}
