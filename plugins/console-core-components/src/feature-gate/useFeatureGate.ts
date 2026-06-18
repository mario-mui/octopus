/*
 * Single-gate hook: the React equivalent of `FeatureGateService.isEnabled` /
 * `isNegateEnabled`. Returns whether `name` is enabled (with optional `negate`),
 * plus the loading flag so callers can distinguish "off" from "not loaded yet".
 *
 * An empty/omitted `name` is treated as enabled, matching the console directive
 * (`*aclFeatureGate` with no feature name renders its content).
 */
import { useFeatureGates } from './useFeatureGates';

export interface UseFeatureGateOptions {
  /** Check the gate for a specific cluster (defaults to the global gates). */
  cluster?: string;
  /** Invert the result — enabled when the gate is OFF (`isNegateEnabled`). */
  negate?: boolean;
}

export interface FeatureGateState {
  /** Whether the gate is enabled (respecting `negate`). `false` until loaded. */
  enabled: boolean;
  /** True while the backing gates are still loading. */
  loading: boolean;
}

/** Whether feature gate `name` is enabled. */
export function useFeatureGate(
  name: string | undefined,
  options: UseFeatureGateOptions = {},
): FeatureGateState {
  const { cluster, negate = false } = options;
  const { gates, loading } = useFeatureGates(cluster);

  const base = name ? !!gates[name] : true;
  const enabled = name && negate ? !base : base;

  return { enabled, loading };
}
