/*
 * The task picker's catalog: the union of the namespace's Tekton Tasks and the
 * Tekton Hub catalog, fetched from the two APIs the console uses:
 *   - GET  /kubernetes/<cluster>/apis/tekton.dev/v1/namespaces/<ns>/tasks
 *   - GET  /clusters-rewrite/<cluster>/hub/api/v1alpha1/tasks
 * Each source is normalised to a `CatalogTask` (display fields + the spec for
 * the detail tabs + the `taskRef` to emit on select). Mirrors the console's
 * `TaskListBasic` (nsTasks + hubList).
 */
import { parse } from 'yaml';
import type { K8sApiClient } from '@octopus/console-core-common';
import { API_GATEWAY } from '@octopus/console-core-common';

import { TASK_DEFINITION } from '../../api/pipelineApi';
import {
  HubResource,
  Task,
  TaskSpec,
  TektonResourceRef,
  TektonResourceRefKind,
  TektonResourceRefResolver,
} from '../../types';
import { MOCK_TASKS } from '../orchestration/mockTasks';
import {
  getTaskCategories,
  getTaskColor,
  getTaskCreatedAt,
  getTaskDescription,
  getTaskDisplayName,
  getTaskIcon,
  getTaskName,
  getTaskPlatforms,
} from '../taskMeta';

const GLOBAL_CLUSTER = 'global';
const HUB_DISPLAY_NAME = 'hub.tekton.dev/displayName';
const HUB_DESCRIPTION = 'hub.tekton.dev/description';
const HUB_CATEGORIES = 'hub.tekton.dev/categories';
const HUB_CATALOG = 'hub.tekton.dev/catalog';

export type TaskSource = 'namespace' | 'hub';

export interface CatalogTask {
  source: TaskSource;
  key: string;
  name: string;
  displayName: string;
  description: string;
  categories: string[];
  platforms: string[];
  createdAt: string;
  color: string;
  /** Custom icon image URL (`tekton.dev/icon`), if any. */
  icon?: string;
  /** Task spec for the detail tabs (parsed from the hub manifest for hub tasks). */
  spec?: TaskSpec;
  /** Raw resource for the YAML tab. */
  raw: unknown;
  /** The reference emitted when this task is picked. */
  taskRef: TektonResourceRef;
}

const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

function mapNsTask(task: Task): CatalogTask {
  const name = getTaskName(task);
  return {
    source: 'namespace',
    key: `ns:${name}`,
    name,
    displayName: getTaskDisplayName(task),
    description: getTaskDescription(task),
    categories: getTaskCategories(task),
    platforms: getTaskPlatforms(task),
    createdAt: getTaskCreatedAt(task),
    color: getTaskColor(task),
    icon: getTaskIcon(task),
    spec: task.spec,
    raw: task,
    taskRef: { kind: TektonResourceRefKind.Task, name },
  };
}

function mapHubTask(hub: HubResource): CatalogTask {
  const name = hub.metadata?.name ?? '';
  const ann = (key: string) => hub.metadata?.annotations?.[key];
  const catalog =
    hub.metadata?.labels?.[HUB_CATALOG] ?? ann(HUB_CATALOG) ?? '';
  const version = hub.spec?.version ?? '';
  const manifestTask = hub.spec?.manifest
    ? (parse(hub.spec.manifest) as Task)
    : undefined;
  return {
    source: 'hub',
    key: `hub:${catalog}/${name}/${version}`,
    name,
    displayName: ann(HUB_DISPLAY_NAME) || name,
    description: ann(HUB_DESCRIPTION) || manifestTask?.spec?.description || '',
    categories: splitList(ann(HUB_CATEGORIES)),
    platforms: hub.spec?.platforms ?? [],
    createdAt: hub.metadata?.creationTimestamp ?? '',
    color: getTaskColor({ metadata: { name } } as Task),
    icon: getTaskIcon(manifestTask),
    spec: manifestTask?.spec,
    raw: manifestTask ?? hub,
    taskRef: {
      resolver: TektonResourceRefResolver.Hub,
      params: [
        { name: 'catalog', value: catalog },
        { name: 'kind', value: 'task' },
        { name: 'name', value: name },
        { name: 'version', value: version },
      ],
    },
  };
}

const clusterRewrite = (cluster: string) =>
  cluster && cluster !== GLOBAL_CLUSTER ? `/clusters-rewrite/${cluster}` : '';

type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;

async function fetchHubTasks(
  fetchFn: AuthFetch,
  cluster: string,
): Promise<HubResource[]> {
  try {
    const res = await fetchFn(
      `${API_GATEWAY}${clusterRewrite(cluster)}/hub/api/v1alpha1/tasks`,
      { headers: { Accept: 'application/json' }, credentials: 'include' },
    );
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as { items?: HubResource[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

/** Fetch the namespace Tasks + hub catalog, normalised + merged. */
export async function fetchTaskCatalog(
  k8sApi: K8sApiClient,
  fetchFn: AuthFetch,
  cluster: string | undefined,
  namespace: string | undefined,
): Promise<CatalogTask[]> {
  // No cluster (dev harness): only the demo catalog.
  if (!cluster) {
    return MOCK_TASKS.map(mapNsTask);
  }
  const [nsItems, hubItems] = await Promise.all([
    k8sApi
      .listResource<Task>({ cluster, namespace, definition: TASK_DEFINITION })
      .then(list => list.items ?? [])
      .catch(() => [] as Task[]),
    fetchHubTasks(fetchFn, cluster),
  ]);
  const nsTasks = (nsItems.length ? nsItems : MOCK_TASKS).map(mapNsTask);
  return [...nsTasks, ...hubItems.map(mapHubTask)];
}
