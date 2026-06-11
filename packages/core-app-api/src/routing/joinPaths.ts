// Joins a list of paths together, avoiding trailing and duplicate slashes
export function joinPaths(...paths: string[]): string {
  const normalized = paths.join('/').replace(/\/\/+/g, '/');
  if (normalized !== '/' && normalized.endsWith('/')) {
    return normalized.slice(0, -1);
  }
  return normalized;
}
