/*
 * Feature-gate types, ported from the console SDK's
 * `dynamic-plugin-sdk/src/feature-gate/type.ts`.
 *
 * Only the `FeatureGate` resource and its enums are needed by the React port;
 * the enterprise-support license types from the Angular module are domain
 * specific and intentionally left out (add them where they're actually used).
 */
import type { KubernetesResource } from '@octopus/console-core-common';

export enum DependencyType {
  Any = 'any',
  All = 'all',
}

export enum FeatureStage {
  Alpha = 'Alpha',
  Beta = 'Beta',
  GA = 'GA',
  EOF = 'EOF',
}

/** A `featuregates.fg/v1` resource. `status.enabled` is the effective state. */
export interface FeatureGate extends KubernetesResource {
  spec: {
    dependency: {
      type: DependencyType;
      featureGates: string[];
    };
    description: string;
    enabled: boolean;
    stage: FeatureStage;
  };
  status: {
    enabled: boolean;
  };
}

/** Resolved gate states: `{ <gate-name>: status.enabled }`. */
export type FeatureGateMap = Record<string, boolean>;
