/*
 * Resolves the Tekton Task backing every pipeline task node, once, on entering
 * the pipeline detail/editor — so each node's drawer can show the task's
 * declared params / workspaces / results / steps.
 *
 * React port of the console's `TaskResourceService`. It fetches each source
 * ONLY when a ref of that kind is present (like the console's per-ref
 * resolution), and dedups concurrent identical requests via a small in-flight
 * cache (the console uses a shareReplay CacheStore) so a double effect run
 * doesn't double-fetch:
 *  - inline `taskSpec`     → wrapped directly (no fetch);
 *  - namespaced `taskRef`  → the namespace's Task list, via the standard k8s
 *                            API (`useApi(K8sApi)`);
 *  - hub `taskRef`         → the Tekton Hub catalog, via non-k8s gateway calls
 *                            (so the auth-aware `fetch`): one batch list (POST
 *                            …/hub/…/tasks), then per task its matched entry's
 *                            `spec.manifest` or a single GET (…/<catalog>/<kind>/
 *                            <name>/<version>). The manifest YAML is parsed to a
 *                            Task.
 */
import { useEffect, useMemo, useState } from 'react';
import { fetchApiRef, useApi } from '@octopus/core-plugin-api';
import { API_GATEWAY, K8sApi } from '@octopus/console-core-common';
import { parse } from 'yaml';
import type { K8sApiClient } from '@octopus/console-core-common';

import { TASK_DEFINITION } from '../../api/pipelineApi';
import {
  HubResource,
  PipelineTask,
  Task,
  TektonResourceRef,
  TektonResourceRefResolver,
} from '../../types';
import { MOCK_TASKS } from './mockTasks';

/** The gateway's "global" cluster needs no cluster-rewrite prefix. */
const GLOBAL_CLUSTER = 'global';

/** Label carrying a hub resource's catalog (cf. the console's HUB_RESOURCE_CATALOG). */
const HUB_CATALOG_LABEL = 'hub.tekton.dev/catalog';

type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;

function isHubRef(ref?: TektonResourceRef): boolean {
  return ref?.resolver === TektonResourceRefResolver.Hub;
}

function isNsRef(ref?: TektonResourceRef): boolean {
  return !!ref?.name && !ref.resolver;
}

interface HubRefParams {
  catalog: string;
  kind: string;
  name: string;
  version: string;
}

function hubRefParams(ref: TektonResourceRef): HubRefParams | null {
  const get = (name: string) => ref.params?.find(p => p.name === name)?.value;
  const name = get('name');
  if (!name) {
    return null;
  }
  return {
    catalog: get('catalog') ?? '',
    kind: get('kind') ?? 'task',
    name,
    version: get('version') ?? '',
  };
}

function hubKey(p: HubRefParams): string {
  return `${p.catalog}/${p.kind}/${p.name}/${p.version}`;
}

/**
 * A stable resolution key for a ref — what a Task is fetched *by*, independent
 * of the pipeline task's (mutable) name. `null` for refs that need no fetch
 * (inline specs are resolved directly). Tasks sharing a key resolve once.
 */
function refKey(ref?: TektonResourceRef): string | null {
  if (isHubRef(ref)) {
    const p = hubRefParams(ref!);
    return p ? `hub:${hubKey(p)}` : null;
  }
  if (isNsRef(ref)) {
    return `ns:${ref!.name}`;
  }
  return null;
}

const clusterRewrite = (cluster: string) =>
  cluster && cluster !== GLOBAL_CLUSTER ? `/clusters-rewrite/${cluster}` : '';

const hubTasksUrl = (cluster: string) =>
  `${API_GATEWAY}${clusterRewrite(cluster)}/hub/api/v1alpha1/tasks`;

const hubTaskUrl = (cluster: string, p: HubRefParams) =>
  `${API_GATEWAY}${clusterRewrite(cluster)}/hub/api/v1alpha1/${p.catalog}/${p.kind}/${p.name}/${p.version}`;

/** Does a hub list entry correspond to a ref? (cf. `isCorrespondingHub`.) */
function isCorrespondingHub(p: HubRefParams, hub: HubResource): boolean {
  return (
    p.catalog === hub.metadata?.labels?.[HUB_CATALOG_LABEL] &&
    p.name === hub.metadata?.name &&
    p.version === hub.spec?.version
  );
}

function manifestToTask(hub: HubResource | null | undefined): Task | null {
  return hub?.spec?.manifest ? (parse(hub.spec.manifest) as Task) : null;
}

/*
 * Collapse concurrent identical requests into one (a double effect run under
 * React StrictMode, or many nodes asking for the same list). Entries clear once
 * settled, so a later visit re-fetches fresh data.
 */
const inflight = new Map<string, Promise<unknown>>();
function dedup<T>(key: string, run: () => Promise<T>): Promise<T> {
  let pending = inflight.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = run().finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
}

async function listNsTasks(
  k8sApi: K8sApiClient,
  cluster: string,
  namespace: string | undefined,
): Promise<Task[]> {
  return dedup(`ns:${cluster}/${namespace ?? ''}`, async () => {
    try {
      const list = await k8sApi.listResource<Task>({
        cluster,
        namespace,
        definition: TASK_DEFINITION,
      });
      return list.items?.length ? list.items : MOCK_TASKS;
    } catch {
      return MOCK_TASKS;
    }
  });
}

async function getJson<T>(fetchFn: AuthFetch, url: string, init?: RequestInit) {
  try {
    const res = await fetchFn(url, {
      credentials: 'include',
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export interface ResolvedTasksState {
  /** Resolved Task per pipeline-task name (null when unresolved). */
  resources: Record<string, Task | null>;
  /** True while resolution is in flight. */
  loading: boolean;
}

/**
 * Resolve `pipelineTasks` to their backing Tasks for `cluster` / `namespace`,
 * re-resolving when the referenced tasks change.
 */
export function useTasks(
  pipelineTasks: PipelineTask[],
  cluster?: string,
  namespace?: string,
): ResolvedTasksState {
  const k8sApi = useApi(K8sApi);
  const fetchApi = useApi(fetchApiRef);
  // Resolved Tasks keyed by ref (not pipeline-task name), so renaming a task —
  // which leaves its ref untouched — neither re-fetches nor blanks the result.
  const [resolved, setResolved] = useState<Record<string, Task | null>>({});
  const [loading, setLoading] = useState(false);

  // Re-resolve only when the referenced tasks change — not on renames or other
  // unrelated edits (the task name is deliberately excluded).
  const refsKey = useMemo(
    () =>
      JSON.stringify(
        pipelineTasks.map(t => ({ ref: t.taskRef, spec: t.taskSpec })),
      ),
    [pipelineTasks],
  );

  useEffect(() => {
    // Tasks that need a fetch (inline specs are resolved synchronously below).
    const fetchTasks = pipelineTasks.filter(
      t => !t.taskSpec && refKey(t.taskRef),
    );
    if (!fetchTasks.length) {
      setResolved({});
      setLoading(false);
      return;
    }
    let ignore = false;
    setLoading(true);

    (async () => {
      const hasNs = fetchTasks.some(t => isNsRef(t.taskRef));
      const hasHub = fetchTasks.some(t => isHubRef(t.taskRef));

      // 1. Namespaced Tasks — fetched only when a NS ref is present.
      const nsTasks: Task[] = hasNs
        ? cluster
          ? await listNsTasks(k8sApi, cluster, namespace)
          : MOCK_TASKS
        : [];

      // 2. Hub batch list — fetched only when a hub ref is present.
      let hubList: HubResource[] = [];
      if (hasHub && cluster) {
        const params = fetchTasks
          .filter(t => isHubRef(t.taskRef))
          .map(t => hubRefParams(t.taskRef!))
          .filter((p): p is HubRefParams => !!p);
        const body = Array.from(
          new Map(params.map(p => [hubKey(p), p])).values(),
        );
        const data = await dedup(
          `hublist:${cluster}:${JSON.stringify(body)}`,
          () =>
            getJson<{ items: HubResource[] }>(fetchApi.fetch, hubTasksUrl(cluster), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }),
        );
        hubList = data?.items ?? [];
      }

      const resolveHub = async (ref: TektonResourceRef): Promise<Task | null> => {
        const params = hubRefParams(ref);
        if (!params || !cluster) {
          return null;
        }
        // Prefer the batch-list entry when it already carries the manifest.
        const hit = hubList.find(hub => isCorrespondingHub(params, hub));
        if (hit?.spec?.manifest) {
          return manifestToTask(hit);
        }
        // Otherwise fetch the single hub resource (deduped per ref).
        const hub = await dedup(`hub:${cluster}:${hubKey(params)}`, () =>
          getJson<HubResource>(fetchApi.fetch, hubTaskUrl(cluster, params)),
        );
        return manifestToTask(hub);
      };

      // 3. Resolve each unique ref once, keyed by its stable ref key.
      const uniqueRefs = new Map<string, TektonResourceRef>();
      for (const t of fetchTasks) {
        const key = refKey(t.taskRef);
        if (key && !uniqueRefs.has(key)) {
          uniqueRefs.set(key, t.taskRef!);
        }
      }
      const entries = await Promise.all(
        [...uniqueRefs].map(
          async ([key, ref]): Promise<[string, Task | null]> => {
            if (isHubRef(ref)) {
              return [key, await resolveHub(ref)];
            }
            return [
              key,
              nsTasks.find(t => t.metadata?.name === ref.name) ?? null,
            ];
          },
        ),
      );

      if (!ignore) {
        setResolved(Object.fromEntries(entries));
        setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [refsKey, cluster, namespace, k8sApi, fetchApi]);

  // The name→Task map, derived (not fetched) so a rename just re-keys the same
  // resolved Task instances — keeping `taskResource` identity stable.
  const resources = useMemo(() => {
    const out: Record<string, Task | null> = {};
    for (const pt of pipelineTasks) {
      if (pt.taskSpec) {
        out[pt.name] = { metadata: {}, spec: pt.taskSpec };
        continue;
      }
      const key = refKey(pt.taskRef);
      out[pt.name] = key ? resolved[key] ?? null : null;
    }
    return out;
  }, [pipelineTasks, resolved]);

  return { resources, loading };
}
