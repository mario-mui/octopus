/*
 * Loads and provides the list of available clusters. Like ProjectContext, the
 * active cluster lives in the URL (see useViewSelection); this only supplies the
 * list.
 *
 * Clusters are fetched the way the console's `acl-cluster-selector` does, via
 * `${API_GATEWAY}/auth/v1/clusters`, and mapped like the console's cluster-list
 * `mapResource`: name, display-name annotation, and a status derived from the
 * `ComponentNotHealthy` condition.
 *
 * A `clusters` prop overrides the fetch (handy for tests / storybook).
 */
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  API_GATEWAY,
  Cluster as K8sCluster,
  KubernetesResourceList,
} from '@octopus/console-core-common';
import { Cluster } from './types';

/** Mirrors the console's `${API_GATEWAY}/auth/v1/clusters`. */
const CLUSTERS_API = `${API_GATEWAY}/auth/v1/clusters`;

/** Derive status from the `ComponentNotHealthy` condition (cf. getClusterStatus). */
function clusterStatus(item: K8sCluster): Cluster['status'] {
  const condition = item.status?.conditions?.find(
    c => c.type === 'ComponentNotHealthy',
  );
  if (condition) {
    return condition.status.toLowerCase() === 'true' ? 'abnormal' : 'normal';
  }
  return 'abnormal';
}

function mapCluster(item: K8sCluster): Cluster {
  // Clusters show their name only — no display name.
  return {
    name: item.metadata?.name ?? '',
    status: clusterStatus(item),
  };
}

async function fetchClusters(signal: AbortSignal): Promise<Cluster[]> {
  const res = await fetch(CLUSTERS_API, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to load clusters: ${res.status}`);
  }
  const data = (await res.json()) as KubernetesResourceList<K8sCluster>;
  return (data.items ?? []).map(mapCluster);
}

interface ClusterContextValue {
  clusters: Cluster[];
}

const ClusterContext = createContext<ClusterContextValue | undefined>(undefined);

export interface ClusterProviderProps {
  /** Supply clusters directly instead of fetching them (tests / storybook). */
  clusters?: Cluster[];
}

export function ClusterProvider({
  clusters: clustersProp,
  children,
}: PropsWithChildren<ClusterProviderProps>) {
  const [clusters, setClusters] = useState<Cluster[]>(clustersProp ?? []);

  useEffect(() => {
    if (clustersProp) {
      setClusters(clustersProp);
      return;
    }
    const controller = new AbortController();
    fetchClusters(controller.signal)
      .then(setClusters)
      .catch(error => {
        if (!controller.signal.aborted) {
          console.error('[cluster-selector] failed to load clusters', error);
        }
      });
    return () => controller.abort();
  }, [clustersProp]);

  const value = useMemo<ClusterContextValue>(() => ({ clusters }), [clusters]);

  return (
    <ClusterContext.Provider value={value}>{children}</ClusterContext.Provider>
  );
}

/** The available clusters. Must be used within a {@link ClusterProvider}. */
export function useClusters(): Cluster[] {
  const ctx = useContext(ClusterContext);
  if (!ctx) {
    throw new Error('useClusters must be used within a ClusterProvider');
  }
  return ctx.clusters;
}
