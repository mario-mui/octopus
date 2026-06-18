/*
 * Shared, per-cluster cache of feature-gate states — the React equivalent of
 * the console's `FeatureGateService` (which used a `CacheStore` + `shareReplay`).
 *
 * The Angular service kept one in-flight request per cluster and replayed its
 * result to every subscriber. We do the same with a module-level `Map`: the
 * first `loadFeatureGates(cluster)` fires the request and caches the resolved
 * `{ name: enabled }` map; concurrent/later callers reuse the cached value (or
 * the pending promise). Hooks subscribe to invalidations so a `refetch` reloads
 * everyone. Because the map is module-level it is naturally shared across the
 * host and every Module-Federation remote (console-core-common — which owns
 * `API_GATEWAY` — is an MF singleton).
 *
 * The fetch itself is the app's auth-aware `fetch` (`fetchApiRef.fetch`), passed
 * in by the calling hook, matching the other data hooks in this package.
 */
import {
  API_GATEWAY,
  type KubernetesResourceList,
} from '@octopus/console-core-common';

import type { FeatureGate, FeatureGateMap } from './types';

interface Entry {
  /** Resolved gate map, once loaded. */
  value?: FeatureGateMap;
  /** In-flight request, deduped across callers. */
  promise?: Promise<FeatureGateMap>;
}

/** `undefined` cluster → the global gates; otherwise the cluster's gates. */
const cacheKey = (cluster?: string) => cluster ?? '';

const gatesUrl = (cluster?: string) =>
  cluster
    ? `${API_GATEWAY}/fg/v1/${cluster}/featuregates`
    : `${API_GATEWAY}/fg/v1/featuregates`;

const store = new Map<string, Entry>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribe to cache changes (load completion / invalidation). */
export function subscribeFeatureGates(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Synchronously read the cached gates for a cluster, if already loaded. */
export function getCachedFeatureGates(
  cluster?: string,
): FeatureGateMap | undefined {
  return store.get(cacheKey(cluster))?.value;
}

/**
 * Load (or reuse the cached) gate states for a cluster. Errors resolve to an
 * empty map and are cached — call {@link refetchFeatureGates} to retry. Mirrors
 * the console service's `catchError(() => of({}))` + `shareReplay`.
 */
export function loadFeatureGates(
  fetch: typeof globalThis.fetch,
  cluster?: string,
): Promise<FeatureGateMap> {
  const key = cacheKey(cluster);
  const existing = store.get(key);
  if (existing?.value) {
    return Promise.resolve(existing.value);
  }
  if (existing?.promise) {
    return existing.promise;
  }

  const promise = fetch(gatesUrl(cluster), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to load feature gates: ${res.status}`);
      }
      return res.json() as Promise<KubernetesResourceList<FeatureGate>>;
    })
    .then(list => {
      const map = (list.items ?? []).reduce<FeatureGateMap>((acc, gate) => {
        if (gate.metadata?.name) {
          acc[gate.metadata.name] = gate.status?.enabled ?? false;
        }
        return acc;
      }, {});
      store.set(key, { value: map });
      notify();
      return map;
    })
    .catch(error => {
      console.error('[feature-gate] failed to load feature gates', error);
      const empty: FeatureGateMap = {};
      store.set(key, { value: empty });
      notify();
      return empty;
    });

  store.set(key, { promise });
  return promise;
}

/**
 * Drop cached gates so the next read reloads. With no argument, clears every
 * cached cluster (matching the console's `refetchCache()` semantics).
 */
export function refetchFeatureGates(cluster?: string): void {
  if (cluster === undefined) {
    store.clear();
  } else {
    store.delete(cacheKey(cluster));
  }
  notify();
}
