/*
 * React port of the console's feature-gate module
 * (`dynamic-plugin-sdk/src/feature-gate`). The Angular `FeatureGateService`
 * becomes a shared cache + hooks; the `*aclFeatureGate` directive becomes the
 * `<FeatureGate>` component. The router `FeatureGuard` is intentionally not
 * ported here — route guarding belongs to the app's routing, not a component
 * library; build it on `useFeatureGate` where routes are defined if needed.
 */
export { FeatureGate } from './FeatureGate';
export type { FeatureGateProps } from './FeatureGate';
export { useFeatureGate } from './useFeatureGate';
export type {
  UseFeatureGateOptions,
  FeatureGateState,
} from './useFeatureGate';
export { useFeatureGates } from './useFeatureGates';
export type { FeatureGatesState } from './useFeatureGates';
export { useFilterEnabled, filterEnabledByGates } from './useFilterEnabled';
export {
  getCachedFeatureGates,
  loadFeatureGates,
  refetchFeatureGates,
  subscribeFeatureGates,
} from './featureGateStore';
export { DependencyType, FeatureStage } from './types';
export type { FeatureGate as FeatureGateResource, FeatureGateMap } from './types';
