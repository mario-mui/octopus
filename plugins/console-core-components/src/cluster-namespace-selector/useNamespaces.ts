/*
 * Loads the namespaces of a project's cluster for the cluster-namespace
 * selector's popup.
 *
 * Mirrors the console's `acl-cluster-namespace-selector`, which lists namespaces
 * per project + cluster (`getNamespacesByProjectAndCluster`). We hit the same
 * auth-gateway endpoint:
 *   ${API_GATEWAY}/auth/v1/projects/<project>/clusters/<cluster>/namespaces
 * through the app's auth-aware `fetch` (`useApi(fetchApiRef)`), so it carries
 * credentials across the host / remote boundary.
 *
 * Switching project / cluster reloads; missing either yields an empty list. The
 * fetch is aborted on change / unmount so a slow response can't clobber a newer
 * one.
 */
import { useEffect, useState } from 'react';
import { fetchApiRef, useApi } from '@octopus/core-plugin-api';
import {
  API_GATEWAY,
  KubernetesResourceList,
  Namespace,
} from '@octopus/console-core-common';

const namespacesApi = (project: string, cluster: string) =>
  `${API_GATEWAY}/auth/v1/projects/${project}/clusters/${cluster}/namespaces`;

interface NamespacesState {
  /** The cluster's namespaces (empty until loaded, or when missing inputs). */
  namespaces: Namespace[];
  /** True while a load is in flight. */
  loading: boolean;
}

/** Load the namespaces of `project` / `cluster`, reloading when either changes. */
export function useNamespaces(
  project: string | undefined,
  cluster: string | undefined,
): NamespacesState {
  const fetchApi = useApi(fetchApiRef);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!project || !cluster) {
      setNamespaces([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchApi
      .fetch(namespacesApi(project, cluster), {
        headers: { Accept: 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load namespaces: ${res.status}`);
        }
        return res.json() as Promise<KubernetesResourceList<Namespace>>;
      })
      .then(list => {
        if (!controller.signal.aborted) {
          setNamespaces(list.items ?? []);
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
  }, [project, cluster, fetchApi]);

  return { namespaces, loading };
}
