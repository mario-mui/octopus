/*
 * Minimal, dependency-free re-implementations of the handful of lodash helpers
 * the ported graph algorithms rely on. Kept internal so the package stays free
 * of a lodash dependency.
 */

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b || a == null || b == null) {
    return false;
  }
  if (typeof a !== 'object') {
    return a === b;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((v, i) => isEqual(v, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) {
    return false;
  }
  return ak.every(k => isEqual(ao[k], bo[k]));
}

export function uniqWith<T>(arr: T[], comparator: (a: T, b: T) => boolean): T[] {
  const res: T[] = [];
  for (const item of arr) {
    if (!res.some(r => comparator(r, item))) {
      res.push(item);
    }
  }
  return res;
}

export function cloneDeep<T>(value: T): T {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(v => cloneDeep(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = cloneDeep(v);
  }
  return out as T;
}

export function uniqBy<T>(arr: T[], key: keyof T | ((item: T) => unknown)): T[] {
  const getKey = typeof key === 'function' ? key : (item: T) => item[key];
  const seen = new Set<unknown>();
  const res: T[] = [];
  for (const item of arr) {
    const k = getKey(item);
    if (!seen.has(k)) {
      seen.add(k);
      res.push(item);
    }
  }
  return res;
}

/** Single-argument memoization keyed by a resolver (defaults to first arg). */
export function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  resolver: (...args: A) => unknown,
): (...args: A) => R {
  const cache = new Map<unknown, R>();
  return (...args: A): R => {
    const key = resolver(...args);
    if (cache.has(key)) {
      return cache.get(key) as R;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

export function kebabCase(str: string): string {
  return (
    str
      ?.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || ''
  );
}
