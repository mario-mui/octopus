/*
 * Example static plugin. Demonstrates contributing pages (and the auto-derived
 * sidebar nav) to an Octopus app via PageBlueprint, plus decoupled routing via
 * route refs.
 */
import { createFrontendPlugin } from '@octopus/core-plugin-api';
import { PageBlueprint } from '@octopus/app-defaults';
import {
  ClusterOutlined,
  HomeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { HomePage } from './HomePage';
import { ClustersPage } from './ClustersPage';
import { SettingsPage } from './SettingsPage';
import { homeRouteRef, clustersRouteRef, settingsRouteRef } from './routes';

const homePage = PageBlueprint.make({
  name: 'home',
  params: {
    path: 'home',
    title: 'Home',
    icon: <HomeOutlined />,
    view: 'application',
    element: <HomePage />,
    routeRef: homeRouteRef,
  },
});

const clustersPage = PageBlueprint.make({
  name: 'clusters',
  params: {
    path: '/',
    title: 'Clusters',
    icon: <ClusterOutlined />,
    view: 'cluster',
    element: <ClustersPage />,
    routeRef: clustersRouteRef,
  },
});

const settingsPage = PageBlueprint.make({
  name: 'settings',
  params: {
    path: '/',
    title: 'Settings',
    icon: <SettingOutlined />,
    view: 'platform',
    element: <SettingsPage />,
    routeRef: settingsRouteRef,
  },
});

export const homePlugin = createFrontendPlugin({
  pluginId: 'home',
  routes: {
    home: homeRouteRef,
    clusters: clustersRouteRef,
    settings: settingsRouteRef,
  },
  extensions: [homePage, clustersPage, settingsPage],
});
