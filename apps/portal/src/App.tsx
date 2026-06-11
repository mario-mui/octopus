import { ConfigProvider, Result, Typography } from 'antd';
import { createApp, OctopusApp } from '@octopus/core-app-api';
import type { FrontendFeature } from '@octopus/core-plugin-api';
import { appPlugin } from '@octopus/app-defaults';
import { homePlugin } from '@octopus/plugin-home';

// Injected by the dev-console rsbuild plugin: in dev it is the proxy origin
// (e.g. "http://localhost:8082"), otherwise `false`. The typeof guard avoids a
// ReferenceError when it was never defined (e.g. tests).
declare const __OCTOPUS_DEV_CONSOLE__: string | false;
const DEV_CONSOLE_ORIGIN =
  typeof __OCTOPUS_DEV_CONSOLE__ !== 'undefined' && __OCTOPUS_DEV_CONSOLE__
    ? __OCTOPUS_DEV_CONSOLE__
    : '';

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
      // Auth gate: with no dev console, dev auto-logs in a local guest and prod
      // redirects anonymous users to `loginUrl`. When the dev console is active,
      // sign-in redirects straight to its dex entry point (a fixed URL, so no
      // flaky token/login round-trip) and the user comes from the id token.
      auth: DEV_CONSOLE_ORIGIN
        ? {
            loginUrl: '/login',
            userInfoUrl: '/console/api/v2/token/info',
            signInUrl: `${DEV_CONSOLE_ORIGIN}/dex/auth`,
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
