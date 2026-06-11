import { JsonValue } from '@octopus/types';

/**
 * Looks up a value by path in a nested object structure.
 *
 * @remarks
 *
 * The path should be a dot-separated string of keys to traverse. The traversal
 * will tolerate object keys containing dots, and will keep searching until a
 * value has been found or all matching keys have been traversed.
 *
 * This lookup does not traverse into arrays, returning `undefined` instead.
 *
 * @public
 */
export function getJsonValueAtPath(
  value: JsonValue | undefined,
  path: string,
): JsonValue | undefined {
  if (!path) {
    return undefined;
  }
  if (
    value === undefined ||
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return undefined;
  }

  for (const valueKey in value) {
    if (!Object.hasOwn(value, valueKey)) {
      continue;
    }
    if (valueKey === path) {
      if (value[valueKey] !== undefined) {
        return value[valueKey];
      }
    }
    if (path.startsWith(`${valueKey}.`)) {
      const found = getJsonValueAtPath(
        value[valueKey],
        path.slice(valueKey.length + 1),
      );
      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}
