import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

// Identity-critical packages must be shared singletons so the host recognises
// this remote's plugin ($$type brand), shares the same coreExtensionData refs,
// React, and the DI/router contexts (cross-bundle global singletons).
const singleton = { singleton: true, requiredVersion: false } as const;
const shared = {
  react: singleton,
  'react-dom': singleton,
  'react-router-dom': singleton,
  antd: singleton,
  '@octopus/core-plugin-api': singleton,
  '@octopus/version-bridge': singleton,
  '@octopus/internal-opaque': singleton,
  '@octopus/types': singleton,
  '@octopus/errors': singleton,
  '@octopus/config': singleton,
  '@octopus/filter-predicates': singleton,
};

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'remoteDemo',
      exposes: {
        './plugin': './src/plugin.tsx',
      },
      shared,
      // Type-declaration generation across the federation boundary is not needed
      // here (the host consumes the plugin via its runtime brand, not types).
      dts: false,
    }),
  ],
  // Standalone dev entry (not the federated surface).
  source: { entry: { index: './dev/index.tsx' } },
  server: {
    port: 3001,
  },
  dev: {
    // Allow the host (different origin) to load the remote entry.
    assetPrefix: 'http://localhost:3001',
  },
  output: {
    assetPrefix: 'http://localhost:3001',
  },
});
