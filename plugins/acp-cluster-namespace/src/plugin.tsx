/*
 * acp-cluster-namespace: contributes the cluster-scoped namespace management
 * pages to an Octopus app. Ported from the console's Angular `pages/namespace`
 * module. Attaches to the `cluster` view, so its routes resolve under
 * /console/clusters/:clusterName/…
 *
 * The plugin contributes a single routable page and owns its list/detail
 * routing internally (see `NamespaceRoutes`).
 */
import { createFrontendPlugin } from '@octopus/core-plugin-api';
import { PageBlueprint } from '@octopus/app-defaults';
import { AppstoreOutlined } from '@ant-design/icons';
import { NamespaceRoutes } from './NamespaceRoutes';
import { namespaceRouteRef } from './routes';

// One page entry, titled, so it surfaces in the cluster-view sidebar. Its
// element owns the list/detail sub-routes under …/namespaces.
const namespacePage = PageBlueprint.make({
  name: 'namespaces',
  params: {
    path: 'namespaces',
    title: 'Namespaces',
    icon: <AppstoreOutlined />,
    view: 'cluster',
    element: <NamespaceRoutes />,
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
