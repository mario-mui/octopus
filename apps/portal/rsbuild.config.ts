import { defineConfig } from '@rsbuild/core';
import {
  compose,
  withBaseConfig,
  withHostMfeConfig,
  type ConfigTransform,
} from '@octopus/dynamic-plugin-pack';
import { pluginDevConsole } from '@octopus/dev-console';
import mfeConfig from './module-federation.config';

// Host-specific bits that aren't part of the shared MF/base layers: the dev
// console proxy, the page <head> (title + backend favicon), the dev server port
// and the app entry.
const withHostApp: ConfigTransform = config => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    // Dev-only: auto-login against the backend in `.consolerc` (no-op without it).
    pluginDevConsole(),
  ],
  html: {
    // Custom template carrying the initial-load skeleton (replaced on mount).
    template: './index.html',
    tags: [
      {
        tag: 'link',
        attrs: {
          rel: 'shortcut icon',
          href: '/console/api/v1/cm/ui-logos/favicon',
        },
        head: true,
      },
    ],
  },
  server: { port: 3000 },
  source: { entry: { index: './src/index.tsx' } },
});

export default defineConfig(
  compose(
    withHostApp,
    // Remotes are registered at runtime from /remotes.json, so none are declared
    // here — adding a plugin does not require rebuilding the host.
    withHostMfeConfig(mfeConfig),
    withBaseConfig(),
  )({}),
);
