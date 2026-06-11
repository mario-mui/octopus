import { ConfigProvider, Result, Typography } from 'antd';
import { createApp, OctopusApp } from '@octopus/core-app-api';
import type { FrontendFeature } from '@octopus/core-plugin-api';
import { appPlugin } from '@octopus/app-defaults';
import { homePlugin } from '@octopus/plugin-home';

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
