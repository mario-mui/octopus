import { createRoot } from 'react-dom/client';
import { ConfigProvider, Result, Typography } from 'antd';
import { createApp, CreateAppOptions } from '@octopus/core-app-api';
import type { FrontendFeature } from '@octopus/core-plugin-api';
import { appPlugin } from '@octopus/app-defaults';

/** Options for {@link createDevApp}. */
export interface CreateDevAppOptions {
  /** The features (usually the plugin under development) to mount. */
  features: FrontendFeature[];
  /** Static config exposed via `configApiRef`. */
  config?: CreateAppOptions['config'];
  /** External route ref bindings. */
  bindRoutes?: CreateAppOptions['bindRoutes'];
}

/**
 * Creates and renders a minimal development app, mounting the given features
 * inside the default Ant Design app shell (layout, routing, DI). Use it from a
 * plugin's `dev/index.tsx` so `pnpm dev` runs the plugin standalone:
 *
 * @example
 * ```tsx
 * // dev/index.tsx
 * import { createDevApp } from '@octopus/dev-utils';
 * import myPlugin from '../src';
 *
 * createDevApp({ features: [myPlugin] });
 * ```
 */
export function createDevApp(options: CreateDevAppOptions): void {
  const app = createApp({
    // The default app plugin provides the layout the plugin's pages render in.
    features: [appPlugin, ...options.features],
    config: options.config,
    bindRoutes: options.bindRoutes,
  });

  const container = document.getElementById('root');
  if (!container) {
    throw new Error(
      "Dev app root '#root' not found. The dev entry HTML must contain a <div id=\"root\">.",
    );
  }

  createRoot(container).render(
    <ConfigProvider>
      {app.errors.length > 0 ? (
        <Result
          status="error"
          title="Dev app failed to wire extensions"
          subTitle={
            <Typography.Paragraph>
              <pre style={{ textAlign: 'left' }}>
                {app.errors.map(e => `[${e.code}] ${e.message}`).join('\n')}
              </pre>
            </Typography.Paragraph>
          }
        />
      ) : (
        app.getRootElement()
      )}
    </ConfigProvider>,
  );
}
