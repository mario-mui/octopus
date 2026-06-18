/*
 * Conditional renderer gated on a feature gate — the React equivalent of the
 * console's `*aclFeatureGate` structural directive:
 *
 *   <ng-container *aclFeatureGate="'my-gate'; cluster: c; negate: n; else: tpl">
 * becomes
 *   <FeatureGate name="my-gate" cluster={c} negate={n} fallback={tpl}>…</FeatureGate>
 *
 * Like the directive, an empty `name` renders the children unconditionally, and
 * while the gates are still loading nothing is rendered (override with
 * `loadingFallback`) so content doesn't flash before its gate resolves.
 */
import type { ReactNode } from 'react';

import { useFeatureGate } from './useFeatureGate';

export interface FeatureGateProps {
  /** Gate to check; empty/omitted renders `children` unconditionally. */
  name?: string;
  /** Check the gate for a specific cluster (defaults to the global gates). */
  cluster?: string;
  /** Render `children` when the gate is OFF instead of ON. */
  negate?: boolean;
  /** Rendered when the gate is not satisfied (the directive's `else`). */
  fallback?: ReactNode;
  /** Rendered while the gates load (default: nothing, matching the directive). */
  loadingFallback?: ReactNode;
  children: ReactNode;
}

/** Render `children` only when the given feature gate is satisfied. */
export function FeatureGate({
  name,
  cluster,
  negate = false,
  fallback = null,
  loadingFallback = null,
  children,
}: FeatureGateProps) {
  const { enabled, loading } = useFeatureGate(name, { cluster, negate });

  // No gate → always render (matches the directive with an empty feature name).
  if (!name) {
    return <>{children}</>;
  }
  if (loading) {
    return <>{loadingFallback}</>;
  }
  return <>{enabled ? children : fallback}</>;
}
