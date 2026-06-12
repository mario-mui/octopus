/*
 * Module Federation `shared` config for Octopus host/remotes.
 *
 * These identity-critical packages MUST resolve to a single shared instance so
 * the host recognises a remote's plugin (its `$$type` brand), they agree on the
 * same `coreExtensionData` refs, and React plus the DI/router cross-bundle
 * global singletons are not duplicated. Host and every remote must pass the
 * exact same object — hence it lives here, imported by both.
 */
const singleton = { singleton: true, requiredVersion: false } as const;

export const shared = {
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
  // Holds the shared k8s API references (K8sApi/K8sPermissionApi/K8sUtil), whose
  // object identity must match between the host (which registers the providers)
  // and remotes (which `useApi` them).
  '@octopus/console-core-common': singleton,
};
