/*
 * Example static plugin. Demonstrates contributing pages (and the auto-derived
 * sidebar nav) to an Octopus app via PageBlueprint, plus decoupled routing via
 * route refs.
 */
import { createFrontendPlugin } from '@octopus/core-plugin-api';
import { PageBlueprint } from '@octopus/app-defaults';
import { HomeOutlined, SettingOutlined } from '@ant-design/icons';
import { HomePage } from './HomePage';
import { SettingsPage } from './SettingsPage';
import { homeRouteRef, settingsRouteRef } from './routes';

const homePage = PageBlueprint.make({
  name: 'home',
  params: {
    path: '/',
    title: 'Home',
    icon: <HomeOutlined />,
    element: <HomePage />,
    routeRef: homeRouteRef,
  },
});

const settingsPage = PageBlueprint.make({
  name: 'settings',
  params: {
    path: '/settings',
    title: 'Settings',
    icon: <SettingOutlined />,
    element: <SettingsPage />,
    routeRef: settingsRouteRef,
  },
});

export const homePlugin = createFrontendPlugin({
  pluginId: 'home',
  routes: { home: homeRouteRef, settings: settingsRouteRef },
  extensions: [homePage, settingsPage],
});
