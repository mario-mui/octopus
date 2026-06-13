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
  // `@monaco-editor/react` is a tiny, monaco-free loader. Sharing it as a
  // singleton means the host's `setupMonaco` configures one loader that every
  // remote's `<Editor>` reuses → a single monaco instance across host + remotes.
  // monaco-editor itself is deliberately NOT shared (sharing it panics rspack's
  // RealContentHashPlugin and creates worker-chunk runtime cycles); the host
  // loads it and owns the workers instead (see `@octopus/code-editor/setup`).
  '@monaco-editor/react': singleton,
  // antd-style (used by core-components, code-editor, topology, …) is built on
  // @emotion. Without sharing, each host/remote bundles its own @emotion, which
  // warns "loading @emotion/react when it is already loaded" and gives each
  // bundle a separate style cache. Share antd-style + the @emotion core so there
  // is one instance and one cache.
  'antd-style': singleton,
  '@emotion/react': singleton,
  '@emotion/css': singleton,
  '@emotion/cache': singleton,
};
