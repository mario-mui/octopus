/*
 * Workspace URL helpers: how a page's cluster + namespace ride in the route.
 *
 * Ported from the console's `dynamic-plugin-shared/utils/workspace.ts`. A
 * "workspace" is the `{ project, cluster, namespace }` a page operates in. The
 * project comes from the view's route param (`:projectName`); the cluster +
 * namespace are packed into a single extra segment — the `ws` param — encoded
 * as `cluster~namespace` (or just `namespace` when there is no project, e.g.
 * the cluster view, where the cluster is already in the URL).
 *
 * Routes then read like the console's (cf. acp `cron-job.routes`):
 *   :ws/detail/:name   :ws/update/:name
 * so a single opaque segment carries both cluster and namespace.
 */
import { useParams } from 'react-router-dom';

/** The cluster + namespace (and owning project) a page operates in. */
export interface Workspace {
  project: string;
  cluster: string;
  namespace: string;
}

/** Route param name holding the encoded `cluster~namespace` segment. */
export const WORKSPACE_ROUTER_NAME = 'ws';

/** Separator between cluster and namespace in the `ws` segment. */
const WORKSPACE_SEPARATOR = '~';

/**
 * Parse a `ws` segment back into a workspace, or `null` when malformed.
 * `cluster~namespace` → both; a lone `namespace` → namespace only.
 */
export function parseWorkspaceUrl(
  workspace: string | null | undefined,
): Workspace | null {
  if (!workspace) {
    return null;
  }
  const parts = workspace.split(WORKSPACE_SEPARATOR);
  if (parts.length < 1 || parts.length > 2) {
    return null;
  }
  if (parts.length === 1) {
    return { project: '', cluster: '', namespace: parts[0] };
  }
  const [cluster = '', namespace = ''] = parts;
  return { project: '', cluster, namespace };
}

/**
 * Encode a workspace into a `ws` segment. With a project (cluster not in the
 * URL) it packs `cluster~namespace`; without one, just `namespace`.
 */
export function buildWorkspaceUrl(params: Partial<Workspace>): string {
  const { project, cluster = '', namespace = '' } = params;
  return project
    ? [cluster, namespace].join(WORKSPACE_SEPARATOR)
    : namespace;
}

/**
 * The current page's workspace, read from the route: `project` from the view's
 * `:projectName` param, `cluster` / `namespace` from the `ws` segment (cluster
 * falling back to a `:clusterName` param for the cluster view). Mirrors the
 * console's `getWorkspace`.
 *
 * Relies on react-router merging parent-route params into nested routes, so it
 * works from a plugin's own `<Routes>` mounted under the view.
 */
export function useWorkspace(): Workspace {
  const params = useParams();
  const ws = parseWorkspaceUrl(params[WORKSPACE_ROUTER_NAME]);
  return {
    project: params.projectName ?? '',
    cluster: ws?.cluster || params.clusterName || '',
    namespace: ws?.namespace ?? '',
  };
}
