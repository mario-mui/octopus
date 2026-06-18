/*
 * Low-level hook: the resolved feature-gate map for a cluster, kept in sync with
 * the shared cache (see `featureGateStore`). The React equivalent of subscribing
 * to `FeatureGateService.loadState(cluster)`.
 *
 * Prefer `useFeatureGate` / `<FeatureGate>` for the common single-gate case; use
 * this when you need several gates at once or the `loading` / `refetch` handles.
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchApiRef, useApi } from '@octopus/core-plugin-api';

import {
  getCachedFeatureGates,
  loadFeatureGates,
  refetchFeatureGates,
  subscribeFeatureGates,
} from './featureGateStore';
import type { FeatureGateMap } from './types';

export interface FeatureGatesState {
  /** Resolved gate states (empty until first load completes). */
  gates: FeatureGateMap;
  /** True while the cluster's gates are loading and not yet cached. */
  loading: boolean;
  /** Invalidate this cluster's cache and reload it (and any subscribers). */
  refetch: () => void;
}

/** Load and subscribe to the feature gates of `cluster` (or the global gates). */
export function useFeatureGates(cluster?: string): FeatureGatesState {
  const fetchApi = useApi(fetchApiRef);
  const [gates, setGates] = useState<FeatureGateMap>(
    () => getCachedFeatureGates(cluster) ?? {},
  );
  const [loading, setLoading] = useState(
    () => getCachedFeatureGates(cluster) === undefined,
  );

  useEffect(() => {
    let active = true;

    const sync = () => {
      const cached = getCachedFeatureGates(cluster);
      if (cached) {
        setGates(cached);
        setLoading(false);
        return;
      }
      setLoading(true);
      loadFeatureGates(fetchApi.fetch, cluster).then(map => {
        if (active) {
          setGates(map);
          setLoading(false);
        }
      });
    };

    sync();
    const unsubscribe = subscribeFeatureGates(sync);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [cluster, fetchApi]);

  const refetch = useCallback(() => refetchFeatureGates(cluster), [cluster]);

  return { gates, loading, refetch };
}
