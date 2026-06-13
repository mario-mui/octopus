/*
 * Minimal helpers — a `get(obj, path)` covering the dot / bracket notation the
 * descriptor option paths use (e.g. `spec.items`, `items[0].name`,
 * `metadata.annotations['cpaas.io/display-name']`), so the package needs no
 * lodash dependency.
 */

/** Read `path` from `obj`, returning `fallback` when any segment is missing. */
export function getPath(obj: unknown, path: string, fallback?: unknown): unknown {
  if (!path) {
    return obj ?? fallback;
  }
  const keys = String(path)
    // [0] / ['x'] / ["x"] → .0 / .x
    .replace(/\[(['"]?)([^\]]+?)\1\]/g, '.$2')
    .split('.')
    .filter(Boolean);
  let cur: unknown = obj;
  for (const key of keys) {
    if (cur == null || typeof cur !== 'object') {
      return fallback;
    }
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur === undefined ? fallback : cur;
}
