/*
 * rsbuild plugin that wires the standalone dev-console proxy into the dev
 * server (matching the upstream console, which starts a dev console on :8080):
 *
 *  - Proxies the backend API routes (`/console/api`, `/api`) to the proxy port.
 *  - Starts the proxy server before the dev server boots.
 *  - Injects the flag that switches the app to backend identity mode.
 *
 * `/dex` is NOT proxied here: the proxy returns an `auth_url` pointing straight
 * at its own port, so the browser navigates there directly — which means the
 * proxy port must be reachable from the browser (forward it in a container).
 *
 * With no `.consolerc` it is a no-op, so the app falls back to its built-in
 * (mock) auth.
 */
import type { RsbuildPlugin } from '@rsbuild/core';
import type { Server } from 'node:http';

import { loadConsoleConfig } from './config';
import { PROXY_PORT } from './constants';
import { startDevConsole } from './proxy-server';

export interface DevConsolePluginOptions {
  /** Port for the standalone proxy server. Defaults to 8082. */
  port?: number;
}

export function pluginDevConsole(
  options: DevConsolePluginOptions = {},
): RsbuildPlugin {
  const port = options.port ?? PROXY_PORT;

  return {
    name: 'octopus:dev-console',
    setup(api) {
      const config = loadConsoleConfig();
      if (!config?.console?.login || !config.console.password) {
        if (config) {
          console.info(
            '[dev-console] .consolerc found but login/password missing; skipping auto-login',
          );
        }
        return;
      }

      const isDev = api.context.action === 'dev';
      const target = `http://localhost:${port}`;

      api.modifyRsbuildConfig((rsbuildConfig, { mergeRsbuildConfig }) =>
        mergeRsbuildConfig(rsbuildConfig, {
          // Defined for dev (true) and build (false) so production builds drop
          // the backend branch; a dedicated global keeps it ReferenceError-safe.
          source: { define: { __OCTOPUS_DEV_CONSOLE__: JSON.stringify(isDev) } },
          ...(isDev && {
            server: {
              proxy: {
                '/console/api': { target, ws: true, changeOrigin: false },
                '/api': { target, changeOrigin: false },
              },
            },
          }),
        }),
      );

      if (!isDev) {
        return;
      }

      let server: Server | undefined;
      api.onBeforeStartDevServer(async () => {
        server = await startDevConsole(config, port);
      });
      api.onCloseDevServer(() => {
        server?.close();
      });
    },
  };
}
