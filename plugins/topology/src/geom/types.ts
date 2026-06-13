/*
 * Geometry value-type interfaces. Ported from the console's `@topology` lib
 * (`geom/types.ts`), framework-agnostic.
 */
export interface PointIface {
  x: number;
  y: number;
}

export interface RectIface {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DimensionsIface {
  width: number;
  height: number;
}

/**
 * Padding Format: [all], [vertical, horizontal], [top, horizontal, bottom],
 * [top, right, bottom, left].
 */
export type Padding =
  | number
  | [number]
  | [number, number]
  | [number, number, number]
  | [number, number, number, number];

export interface Translatable {
  translate(dx: number, dy: number): unknown;
}
