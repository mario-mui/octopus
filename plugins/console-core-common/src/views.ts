/*
 * The fixed top-level views of the console shell. The left sidebar is split
 * into exactly these views; each one loads its own navigation, contributed by
 * pages that declare which view they belong to (see PageBlueprint's `view`).
 *
 * Each view also owns a URL space:
 *   - application: /console/applications/:projectName/<sub>
 *   - cluster:     /console/clusters/:clusterName/<sub>
 *   - platform:    /console/platform/<sub>
 * The `:projectName` / `:clusterName` segment (the view's `param`) is the
 * selected resource — the URL is the source of truth for it.
 */

/** The canonical view a page's navigation can belong to. */
export type ViewId = 'application' | 'cluster' | 'platform';

/** A top-level view: its id/label, URL base, and optional context route param. */
export interface ConsoleView {
  id: ViewId;
  /** Label shown on the view rail tab. */
  label: string;
  /** URL prefix owned by the view, e.g. `/console/applications`. */
  basePath: string;
  /** Route param holding the selected resource (e.g. `projectName`), if any. */
  param?: string;
}

/** The three views, in the order they appear in the sidebar rail. */
export const CONSOLE_VIEWS: ConsoleView[] = [
  {
    id: 'application',
    label: 'Application',
    basePath: '/console/applications',
    param: 'projectName',
  },
  {
    id: 'cluster',
    label: 'Cluster',
    basePath: '/console/clusters',
    param: 'clusterName',
  },
  { id: 'platform', label: 'Platform', basePath: '/console/platform' },
];

/** Look up a view by id. */
export function getView(viewId: ViewId): ConsoleView | undefined {
  return CONSOLE_VIEWS.find(view => view.id === viewId);
}

/** Strip leading slashes so sub-paths compose cleanly. */
function normalizeSub(subPath: string): string {
  return subPath.replace(/^\/+/, '');
}

/**
 * The React Router *pattern* for a page in a view, e.g.
 * `('application', '')` → `/console/applications/:projectName`,
 * `('platform', 'settings')` → `/console/platform/settings`.
 */
export function viewRoutePattern(viewId: ViewId, subPath = ''): string {
  const view = getView(viewId);
  if (!view) {
    return `/${normalizeSub(subPath)}`;
  }
  const ctx = view.param ? `/:${view.param}` : '';
  const sub = normalizeSub(subPath);
  return `${view.basePath}${ctx}${sub ? `/${sub}` : ''}`;
}

/**
 * A concrete URL for a view, substituting the selected resource for the param,
 * e.g. `('application', 'kychen', 'workloads')` →
 * `/console/applications/kychen/workloads`.
 */
export function viewPath(
  viewId: ViewId,
  contextValue?: string,
  subPath = '',
): string {
  const view = getView(viewId);
  if (!view) {
    return `/${normalizeSub(subPath)}`;
  }
  const ctx = view.param ? `/${contextValue ?? ''}` : '';
  const sub = normalizeSub(subPath);
  return `${view.basePath}${ctx}${sub ? `/${sub}` : ''}`;
}
