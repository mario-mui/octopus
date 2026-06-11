/*
 * The builtin `app` plugin: provides the Ant Design app layout extension that
 * attaches to the composition root, renders the registered pages, and
 * auto-derives the sidebar navigation from pages that declare a title.
 */
import {
  ApiBlueprint,
  appThemeApiRef,
  coreExtensionData,
  createExtension,
  createExtensionInput,
  createFrontendPlugin,
} from '@octopus/core-plugin-api';
import { AppThemeSelector } from '@octopus/core-app-api';
import { AppLayout, NavItem } from '@octopus/core-components';
import { appInfoApiRef } from './appInfoApi';
import { HeaderActions } from './HeaderActions';
import { AppThemeProvider } from './AppThemeProvider';
import { themes } from './themes';

const layoutExtension = createExtension({
  name: 'layout',
  attachTo: { id: 'root', input: 'app' },
  inputs: {
    routes: createExtensionInput([
      coreExtensionData.routePath,
      coreExtensionData.reactElement,
      coreExtensionData.title.optional(),
      coreExtensionData.icon.optional(),
    ]),
  },
  output: [coreExtensionData.reactElement],
  factory: ({ inputs }) => {
    const routes = inputs.routes.map(route => ({
      path: route.get(coreExtensionData.routePath),
      element: route.get(coreExtensionData.reactElement),
    }));

    // The sidebar is auto-discovered from pages that declare a title.
    const nav: NavItem[] = [];
    for (const route of inputs.routes) {
      const title = route.get(coreExtensionData.title);
      if (!title) {
        continue;
      }
      nav.push({
        to: route.get(coreExtensionData.routePath),
        title,
        icon: route.get(coreExtensionData.icon) ?? undefined,
      });
    }

    return [
      coreExtensionData.reactElement(
        <AppThemeProvider>
          <AppLayout
            nav={nav}
            routes={routes}
            headerActions={<HeaderActions />}
          />
        </AppThemeProvider>,
      ),
    ];
  },
});

// A default implementation of the example app-info utility API.
const appInfoApi = ApiBlueprint.make({
  name: 'app-info',
  params: defineParams =>
    defineParams({
      api: appInfoApiRef,
      deps: {},
      factory: () => ({
        getTitle: () => 'Octopus',
        getVersion: () => '0.0.0',
      }),
    }),
});

// Provides light/dark themes, persisted to localStorage, switchable from the
// account menu. No explicit selection follows the OS preference.
const appThemeApi = ApiBlueprint.make({
  name: 'app-theme',
  params: defineParams =>
    defineParams({
      api: appThemeApiRef,
      deps: {},
      factory: () => AppThemeSelector.createWithStorage(themes),
    }),
});

/**
 * The builtin `app` plugin. Include it in `createApp({ features })` to get the
 * default Ant Design layout and core utility APIs. Its layout extension has the
 * stable id `app/layout`, which {@link PageBlueprint} attaches to.
 */
export const appPlugin = createFrontendPlugin({
  pluginId: 'app',
  extensions: [layoutExtension, appInfoApi, appThemeApi],
});
