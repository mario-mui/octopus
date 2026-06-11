/**
 * Utility type to expand type aliases into their equivalent type.
 * @public
 */

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/**
 * Helper type that expands type hints recursively
 *
 * @public
 */
export type ExpandRecursive<T> = T extends infer O
  ? { [K in keyof O]: ExpandRecursive<O[K]> }
  : never;
