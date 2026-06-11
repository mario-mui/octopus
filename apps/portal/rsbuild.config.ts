import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

// Must match the remotes' shared config so host and remotes resolve a single
// instance of each identity-critical package (brands, data refs, React, the
// DI/router cross-bundle singleton contexts).
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
      name: 'host',
      // Remotes are registered at runtime from /remotes.json, so none are
      // declared here — adding a plugin does not require rebuilding the host.
      remotes: {},
      shared,
      // The host consumes remotes via their runtime brand, not types — disable
      // the MF type-generation server (it otherwise opens a port and collides
      // with a remote's dev server).
      dts: false,
    }),
  ],
  html: {
    title: 'Octopus Portal',
  },
  server: {
    port: 3000,
  },
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
});
