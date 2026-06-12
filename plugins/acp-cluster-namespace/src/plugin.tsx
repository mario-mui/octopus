/*
 * acp-cluster-namespace: contributes the cluster-scoped namespace management
 * pages to an Octopus app. Ported from the console's Angular `pages/namespace`
 * module. Attaches to the `cluster` view, so its routes resolve under
 * /console/clusters/:clusterName/…
 *
 * The plugin contributes a single routable page and owns its list/detail/create/
 * update routing internally (see `NamespaceRoutes`). The plugin definition (nav
 * entry + route) is tiny and loaded eagerly; the page code is code-split via
 * `React.lazy`, so it is fetched only when the user opens the page.
 */
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { createFrontendPlugin } from '@octopus/core-plugin-api';
import { PageBlueprint } from '@octopus/app-defaults';
import { AppstoreOutlined } from '@ant-design/icons';
import { namespaceRouteRef } from './routes';

// Lazy: this `import()` is a code-split point, so the namespace pages (list /
// detail / create / update and their deps) land in a separate async chunk that
// loads on first navigation — not as part of the plugin's `./plugin` bundle.
const NamespaceRoutes = lazy(() => import('./NamespaceRoutes'));

// One page entry, titled, so it surfaces in the cluster-view sidebar. Its
// element owns the list/detail sub-routes under …/namespaces.
const namespacePage = PageBlueprint.make({
  name: 'namespaces',
  params: {
    path: 'namespaces',
    title: 'Namespaces',
    icon: <AppstoreOutlined />,
    view: 'cluster',
    element: (
      <Suspense fallback={<Spin />}>
        <NamespaceRoutes />
      </Suspense>
    ),
    routeRef: namespaceRouteRef,
  },
});

export const acpClusterNamespacePlugin = createFrontendPlugin({
  pluginId: 'acp-cluster-namespace',
  routes: {
    root: namespaceRouteRef,
  },
  // The k8s API / permission / util providers backing `useApi(K8sApi)` etc. are
  // registered once at the app level (app-defaults' appPlugin), so this plugin
  // only contributes pages.
  extensions: [namespacePage],
});

// Default export: the host's dynamic-loader detects this remote's plugin via its
// `$$type` brand and feeds it into the same `createApp` pipeline as a static
// plugin. The plugin bundle stays small because the pages are lazy (above).
export default acpClusterNamespacePlugin;
