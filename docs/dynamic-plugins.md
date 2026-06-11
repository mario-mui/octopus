# Dynamic plugins (Module Federation)

A plugin is **written once** and can be delivered two ways: bundled with the
host (static), or loaded at runtime as a Module Federation remote (dynamic).
Both flow through the same `createApp({ features })` pipeline.

## Build a plugin as a remote

Every generated plugin ships an `rsbuild.config.ts` that exposes `./plugin`:

```bash
pnpm --filter @octopus/plugin-<name> build
# → dist/mf-manifest.json + remoteEntry, exposing ./plugin (default export = the plugin)
```

## Load it in the host

The host reads a runtime manifest, `apps/portal/public/remotes.json`:

```json
[{ "name": "remoteDemo", "entry": "http://localhost:3001/mf-manifest.json", "module": "./plugin" }]
```

`@octopus/dynamic-loader` registers the remotes, loads each exposed module,
checks the `$$type` brand, and returns the valid features:

```ts
const remoteFeatures = await loadRemoteFeaturesFromUrl('/remotes.json');
const app = createPortalApp(remoteFeatures); // → createApp({ features: [...static, ...remoteFeatures] })
```

Adding a plugin = editing the manifest. **The host is not rebuilt.**

## Shared singletons (the critical part)

Host and remotes must share a single instance of every *identity-critical*
package, configured as `singleton` in each side's Module Federation `shared`:

- `react`, `react-dom` — one React, or hooks/contexts break.
- `react-router-dom` — one router context.
- `antd` — one theme/config context, no duplicate CSS-in-JS.
- `@octopus/core-plugin-api` — the plugin/extension `$$type` brands and the
  `coreExtensionData` data-ref identities must be the same objects, or the host
  won't recognise the remote's plugin or match its outputs.
- `@octopus/version-bridge` — the DI/`useApi` and routing React contexts are
  cross-bundle global singletons keyed through here.
- `@octopus/internal-opaque` — the opaque type
  bridges used when resolving plugins.

If any of these is duplicated, a remote's plugin silently fails to wire (its
brand/ref is a *different object* than the host's).

## The async boundary

The host entry does `import('./bootstrap')` so Module Federation can initialise
shared singletons before app code runs.

## Verify end-to-end

```bash
# one-time browser setup
npx playwright install chromium chromium-headless-shell
sudo npx playwright install-deps

bash scripts/mf-e2e.sh
```

This builds host + remote, serves both, drives headless Chromium, and asserts
the remote plugin is loaded, routed, rendered, and that it can even consume a
host-provided utility API across the federation boundary (proving the shared
singletons work).
