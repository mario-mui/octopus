/*
 * Dependency-injected API references for the k8s client / permission / metadata
 * classes, plus their default providers. Plugins consume them via the octopus
 * API container:
 *
 *   const k8sApi = useApi(K8sApi);
 *   const k8sPermissionApi = useApi(K8sPermissionApi);
 *   const k8sUtil = useApi(K8sUtil);
 *
 * The providers are registered once at the app level (see app-defaults'
 * `appPlugin`), so plugins don't each re-register them. The `K8sApi` /
 * `K8sPermissionApi` factories inject `fetchApi`, giving the clients the app's
 * auth-aware `fetch`. An app may override any ref with its own `ApiBlueprint`.
 */

import { ApiBlueprint, createApiRef, fetchApiRef } from '@octopus/core-plugin-api';

import { K8sApiClient } from './K8sApiClient';
import { K8sPermissionClient } from './K8sPermissionClient';
import { K8sUtilClient } from './K8sUtilClient';

export const K8sApi = createApiRef<K8sApiClient>().with({
  id: 'console.k8s-api',
});

export const K8sPermissionApi = createApiRef<K8sPermissionClient>().with({
  id: 'console.k8s-permission',
});

export const K8sUtil = createApiRef<K8sUtilClient>().with({
  id: 'console.k8s-util',
});

/** Default `K8sApi` provider: the fetch-based client, using the app's fetchApi. */
export const k8sApiExtension = ApiBlueprint.make({
  name: 'k8s-api',
  params: defineParams =>
    defineParams({
      api: K8sApi,
      deps: { fetchApi: fetchApiRef },
      factory: ({ fetchApi }) => new K8sApiClient(fetchApi.fetch),
    }),
});

/** Default `K8sPermissionApi` provider. */
export const k8sPermissionApiExtension = ApiBlueprint.make({
  name: 'k8s-permission-api',
  params: defineParams =>
    defineParams({
      api: K8sPermissionApi,
      deps: { fetchApi: fetchApiRef },
      factory: ({ fetchApi }) => new K8sPermissionClient(fetchApi.fetch),
    }),
});

/** Default `K8sUtil` provider: the pure metadata helpers (no fetch needed). */
export const k8sUtilExtension = ApiBlueprint.make({
  name: 'k8s-util',
  params: defineParams =>
    defineParams({
      api: K8sUtil,
      deps: {},
      factory: () => new K8sUtilClient(),
    }),
});
