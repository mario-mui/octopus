/*
 * URL builder for the Kubernetes API gateway. Ported verbatim (logic-wise) from
 * the console SDK's `k8s-api/k8s-api-resource.service.ts#getApiPath` and the
 * `k8s-api/helpers.ts` prefix helpers, with Angular `HttpClient` removed — this
 * is a pure function.
 *
 * Resulting shape (for a cluster-scoped call):
 *   ${API_GATEWAY}/kubernetes/<cluster>/api[s]/<apiGroup>/<apiVersion>
 *     [/namespaces/<namespace>][/<type>][/<name>]
 *
 * e.g. listing namespaces in cluster `global`:
 *   /api-gateway/kubernetes/global/api/v1/namespaces
 */

import { API_GATEWAY } from '../constants';

import type { K8sResourceDefinition } from './resourceDefinitions';

/** Emit `value` only when `cond` is truthy, else an empty string. */
const ifExist = (cond: unknown, value: string): string => (cond ? value : '');

/**
 * Split an `apiVersion`-style prefix into its group + version parts.
 * `apps/v1` → `{ apiGroup: 'apps', apiVersion: 'v1' }`; `v1` → `{ apiGroup: '',
 * apiVersion: 'v1' }`.
 */
export const getApiPrefixParts = (
  apiPrefix?: string,
): { apiGroup: string; apiVersion: string } => {
  if (!apiPrefix) {
    return { apiGroup: '', apiVersion: '' };
  }
  const parts = apiPrefix.split('/');
  return parts.length > 1
    ? { apiGroup: parts[0], apiVersion: parts[1] }
    : { apiGroup: '', apiVersion: parts[0] };
};

/** The core group is addressed at `/api` with no group segment. */
export const normalizeApiGroup = (apiGroup?: string): string =>
  !apiGroup || apiGroup === 'core' ? '' : apiGroup;

export interface ApiPathParams {
  /** Business cluster name; omitted addresses the gateway's default cluster. */
  cluster?: string;
  namespace?: string;
  name?: string;
  /** Resource plural, e.g. `namespaces`. */
  type?: string;
  apiGroup?: string;
  apiVersion?: string;
}

/**
 * Build the gateway URL for a resource. Mirrors the console SDK exactly,
 * including the `/api` vs `/apis/<group>` switch and the `v1` version default.
 */
export function getApiPath({
  cluster,
  namespace,
  name,
  type,
  apiGroup,
  apiVersion,
}: ApiPathParams): string {
  apiGroup = normalizeApiGroup(apiGroup);
  return `${API_GATEWAY}${ifExist(cluster, `/kubernetes/${cluster}`)}/api${
    apiGroup && 's'
  }${ifExist(apiGroup, `/${apiGroup}`)}/${apiVersion || 'v1'}${ifExist(
    namespace,
    `/namespaces/${namespace}`,
  )}${ifExist(type, `/${type}`)}${ifExist(name, `/${name}`)}`;
}

/** Resolve a resource definition's `(apiGroup, apiVersion, type)` for path use. */
export function definitionToApiParts(
  definition: K8sResourceDefinition,
): Pick<ApiPathParams, 'apiGroup' | 'apiVersion' | 'type'> {
  return {
    type: definition.type,
    apiGroup: normalizeApiGroup(definition.apiGroup),
    apiVersion: definition.apiVersion || 'v1',
  };
}
