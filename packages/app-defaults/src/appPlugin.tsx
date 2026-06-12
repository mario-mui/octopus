/*
 * The builtin `app` plugin: provides the Ant Design app layout extension that
 * attaches to the composition root, renders the registered pages, and
 * auto-derives the sidebar navigation from pages that declare a title.
 */
import {
  ApiBlueprint,
  appThemeApiRef,
  configApiRef,
  identityApiRef,
  coreExtensionData,
  createExtension,
  createExtensionInput,
  createFrontendPlugin,
} from '@octopus/core-plugin-api';
import { AppThemeSelector, UserIdentity } from '@octopus/core-app-api';
import { AppLayout, NavItem } from '@octopus/core-components';
import {
  ClusterProvider,
  ClusterSelector,
  ProjectProvider,
  ProjectSelector,
} from '@octopus/console-core-components';
import {
  CONSOLE_VIEWS,
  k8sApiExtension,
  k8sPermissionApiExtension,
  k8sUtilExtension,
} from '@octopus/console-core-common';
import { appInfoApiRef } from './appInfoApi';
import { HeaderActions } from './HeaderActions';
import { AppThemeProvider } from './AppThemeProvider';
import { RequireAuth } from './RequireAuth';
import { themes } from './themes';

// rsbuild/rspack inlines `process.env.NODE_ENV` at build time.
const IS_DEV = process.env.NODE_ENV !== 'production';

const layoutExtension = createExtension({
  name: 'layout',
  attachTo: { id: 'root', input: 'app' },
  inputs: {
    routes: createExtensionInput([
      coreExtensionData.routePath,
      coreExtensionData.reactElement,
      coreExtensionData.title.optional(),
      coreExtensionData.navLabel.optional(),
      coreExtensionData.icon.optional(),
      coreExtensionData.navGroup.optional(),
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
        // A plugin-supplied (e.g. translated) label wins over the text title.
        title: route.get(coreExtensionData.navLabel) ?? title,
        icon: route.get(coreExtensionData.icon) ?? undefined,
        group: route.get(coreExtensionData.navGroup) ?? undefined,
      });
    }

    return [
      coreExtensionData.reactElement(
        <AppThemeProvider>
          <RequireAuth>
            <ProjectProvider>
              <ClusterProvider>
                <AppLayout
                  nav={nav}
                  routes={routes}
                  views={CONSOLE_VIEWS}
                  headerActions={<HeaderActions />}
                  sidebarHeader={({ collapsed, view }) => {
                    // Each view gets its own selector; platform has none.
                    if (view === 'cluster') {
                      return <ClusterSelector collapsed={collapsed} />;
                    }
                    if (view === 'platform') {
                      return null;
                    }
                    return <ProjectSelector collapsed={collapsed} />;
                  }}
                />
              </ClusterProvider>
            </ProjectProvider>
          </RequireAuth>
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

// Identity: in dev (or when `auth.devAutoLogin` is set) a local guest is signed
// in automatically; otherwise an unauthenticated user is redirected to
// `auth.loginUrl` (default `/login`) by the RequireAuth gate.
const identityApi = ApiBlueprint.make({
  name: 'identity',
  params: defineParams =>
    defineParams({
      api: identityApiRef,
      deps: { configApi: configApiRef },
      factory: ({ configApi }) =>
        UserIdentity.resolve({
          devAutoLogin:
            configApi.getOptionalBoolean('auth.devAutoLogin') ?? IS_DEV,
          loginUrl: configApi.getOptionalString('auth.loginUrl') ?? '/login',
          // When set, the real signed-in user is loaded from the backend.
          userInfoUrl: configApi.getOptionalString('auth.userInfoUrl'),
          signInUrl: configApi.getOptionalString('auth.signInUrl'),
        }),
    }),
});

/**
 * The builtin `app` plugin. Include it in `createApp({ features })` to get the
 * default Ant Design layout and core utility APIs. Its layout extension has the
 * stable id `app/layout`, which {@link PageBlueprint} attaches to.
 */
export const appPlugin = createFrontendPlugin({
  pluginId: 'app',
  // The k8s API / permission / metadata providers are registered here, once, at
  // the app level — every plugin can `useApi(K8sApi)` etc. without re-providing.
  extensions: [
    layoutExtension,
    appInfoApi,
    appThemeApi,
    identityApi,
    k8sApiExtension,
    k8sPermissionApiExtension,
    k8sUtilExtension,
  ],
});
