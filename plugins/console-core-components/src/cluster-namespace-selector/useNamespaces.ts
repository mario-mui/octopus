/*
 * Loads the namespaces of a cluster for the cluster-namespace selector's popup.
 *
 * Mirrors the console's `acl-cluster-namespace-selector`, which lists a
 * cluster's namespaces on demand. Data comes through the injected `K8sApi`
 * (`useApi(K8sApi)`), the app's auth-aware Kubernetes client — the same path
 * the namespace list page uses.
 *
 * Switching clusters reloads; an empty cluster yields an empty list. An
 * AbortController guards against a slow response clobbering a newer one (the
 * client can't be cancelled, so this just discards stale results).
 */
import { useEffect, useState } from 'react';
import { useApi } from '@octopus/core-plugin-api';
import {
  COMMON_RESOURCE_DEFINITIONS,
  K8sApi,
  Namespace,
} from '@octopus/console-core-common';

const NAMESPACE = COMMON_RESOURCE_DEFINITIONS.NAMESPACE;

interface NamespacesState {
  /** The cluster's namespaces (empty until loaded, or when no cluster). */
  namespaces: Namespace[];
  /** True while a load is in flight. */
  loading: boolean;
}

/** Load the namespaces of `cluster`, reloading whenever the cluster changes. */
export function useNamespaces(cluster: string | undefined): NamespacesState {
  const k8sApi = useApi(K8sApi);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cluster) {
      setNamespaces([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    k8sApi
      .listResource<Namespace>({ cluster, definition: NAMESPACE })
      .then(list => {
        if (!controller.signal.aborted) {
          setNamespaces(list.items);
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setNamespaces([]);
          console.error(
            '[cluster-namespace-selector] failed to load namespaces',
            error,
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [cluster, k8sApi]);

  return { namespaces, loading };
}
