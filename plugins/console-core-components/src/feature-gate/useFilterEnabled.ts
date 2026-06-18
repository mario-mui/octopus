/*
 * Filter a list by feature gate — the React equivalent of
 * `FeatureGateService.filterEnabled`.
 *
 * `gateAccessor` returns the gate name for an item (falsy → the item has no gate
 * and is always kept). An item carrying a truthy `negate` flag is kept when its
 * gate is OFF. While the gates are still loading the hook returns only the
 * gate-less items, mirroring the Angular `startWith(...)` that pushed those
 * immediately before the resolved list arrived.
 */
import { useMemo } from 'react';

import { useFeatureGates } from './useFeatureGates';
import type { FeatureGateMap } from './types';

/** Pure filter against an already-resolved gate map. */
export function filterEnabledByGates<T>(
  items: T[],
  gateAccessor: (item: T) => string | undefined,
  gates: FeatureGateMap,
): T[] {
  return items.filter(item => {
    const gate = gateAccessor(item);
    if (!gate) {
      return true;
    }
    const negate = (item as { negate?: boolean }).negate;
    return negate ? !gates[gate] : !!gates[gate];
  });
}

/** Reactively filter `items` by their feature gate for `cluster`. */
export function useFilterEnabled<T>(
  items: T[],
  gateAccessor: (item: T) => string | undefined,
  cluster?: string,
): T[] {
  const { gates, loading } = useFeatureGates(cluster);

  return useMemo(() => {
    if (loading) {
      return items.filter(item => !gateAccessor(item));
    }
    return filterEnabledByGates(items, gateAccessor, gates);
  }, [items, gateAccessor, gates, loading]);
}
