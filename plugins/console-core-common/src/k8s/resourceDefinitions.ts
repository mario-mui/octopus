/*
 * Resource definitions: the minimal `(apiGroup, apiVersion, type)` descriptor
 * the API path builder needs to address a Kubernetes resource. Ported from the
 * console SDK's `k8s-api/resource-definitions.ts` — only the subset of kinds the
 * cluster/namespace views need.
 *
 * `type` is the resource *plural* used in the URL (e.g. `namespaces`).
 * `apiGroup` omitted (or `'core'`) means the core (`/api`) group; otherwise the
 * resource lives under `/apis/<apiGroup>`. `apiVersion` defaults to `v1`.
 */

export interface K8sResourceDefinition {
  /** Resource plural used in the API path, e.g. `namespaces`, `resourcequotas`. */
  type: string;
  /** API group; omit or use `'core'` for the core group. */
  apiGroup?: string;
  /** API version; defaults to `v1`. */
  apiVersion?: string;
}

export const COMMON_RESOURCE_DEFINITIONS = {
  NAMESPACE: {
    type: 'namespaces',
  },
  RESOURCE_QUOTA: {
    type: 'resourcequotas',
  },
  LIMIT_RANGE: {
    type: 'limitranges',
  },
} satisfies Record<string, K8sResourceDefinition>;

export type CommonResourceType = keyof typeof COMMON_RESOURCE_DEFINITIONS;
