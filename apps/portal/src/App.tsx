import { ConfigProvider, Result, Typography } from 'antd';
import { createApp, OctopusApp } from '@octopus/core-app-api';
import type { FrontendFeature } from '@octopus/core-plugin-api';
import { appPlugin } from '@octopus/app-defaults';
import { homePlugin } from '@octopus/plugin-home';

// Injected by the dev-console rsbuild plugin in dev; undefined otherwise. The
// typeof guard avoids a ReferenceError when it was not defined.
declare const __OCTOPUS_DEV_CONSOLE__: boolean;
const DEV_CONSOLE_ACTIVE =
  typeof __OCTOPUS_DEV_CONSOLE__ !== 'undefined' && __OCTOPUS_DEV_CONSOLE__;

/**
 * Composes the portal from the builtin layout plugin, the static feature
 * plugins, and any extra features (e.g. Module Federation remotes loaded at
 * runtime). They all flow through the same `createApp` pipeline.
 */
export function createPortalApp(extraFeatures: FrontendFeature[] = []): OctopusApp {
  return createApp({
    // Static app config, exposed to plugins via configApiRef (no backend).
    config: {
      app: { title: 'Octopus Portal' },
      organization: { name: 'Acme Corp' },
      i18n: { availableLanguages: ['en', 'de'], defaultLanguage: 'en' },
      // Auth gate: dev auto-logs in a local guest; prod redirects anonymous
      // users to `loginUrl`. Set `devAutoLogin` to override the NODE_ENV default.
      // When the dev console is active (real backend in `.consolerc`), resolve
      // the real signed-in user from the backend session instead. The
      // `__OCTOPUS_DEV_CONSOLE__` global is injected only by the dev-console
      // plugin in dev; the typeof guard keeps it safe (and false) otherwise.
      auth: DEV_CONSOLE_ACTIVE
        ? {
            loginUrl: '/login',
            userInfoUrl: '/console/api/v2/token/info',
            signInUrl: '/console/api/v2/token/login',
          }
        : { loginUrl: '/login' },
    },
    features: [appPlugin, homePlugin, ...extraFeatures],
  });
}

/** Renders a composed Octopus app, surfacing any wiring errors. */
export function AppView({ app }: { app: OctopusApp }) {
  if (app.errors.length > 0) {
    return (
      <Result
        status="error"
        title="App failed to wire extensions"
        subTitle={
          <Typography.Paragraph>
            <pre style={{ textAlign: 'left' }}>
              {app.errors.map(e => `[${e.code}] ${e.message}`).join('\n')}
            </pre>
          </Typography.Paragraph>
        }
      />
    );
  }

  return <ConfigProvider>{app.getRootElement()}</ConfigProvider>;
}
