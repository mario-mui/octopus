# Octopus Architecture

Octopus borrows Backstage's **frontend framework architecture** — and nothing
else. There are no built-in product features (no catalog, scaffolder, techdocs,
search); Octopus is just the machinery for composing an application out of
plugins. The UI layer is rendered with [Ant Design](https://ant.design/), and
there is no backend (utility APIs that don't need one are still provided).

The extension engine and tree-resolution algorithm are ported from Backstage's
`@backstage/frontend-plugin-api` / `@backstage/frontend-app-api` (Apache-2.0),
with the Material UI layer removed and rebuilt on Ant Design, and the legacy
compatibility / app-config-loading layers dropped. Runtime brand strings are
re-namespaced to `@octopus/*`.

---

## 1. The big picture

```
  plugins / modules  ── what you write (static import, or MF remote)
        │
        ▼
  createApp({ features, config, bindRoutes })            @octopus/core-app-api
        │
        │  1. resolveAppNodeSpecs   collect extensions, apply config/overrides
        │  2. resolveAppTree        build the parent→child tree from attachTo
        │  3. instantiateAppNodeTree run factories bottom-up, wire inputs↔outputs
        │  4. collect routes + APIs, build the DI container & route resolver
        ▼
  app tree of instantiated extensions
        │
   builtin Root extension
        ├── input `app`  ──► <AppLayout/> (antd) ──► pages → React Router  (UI)
        └── input `apis` ──► utility-API factories ──► DI container (ApiHolder)
        │
        ▼
  getRootElement()  ──►  <ApiProvider apis={…}> <AppLayout/> </ApiProvider>
```

Everything — static plugins, Module Federation remotes, the builtin layout,
utility APIs — flows through the same `createApp` pipeline.

---

## 2. Core concepts

| Concept | Created with | What it is |
| --- | --- | --- |
| **Extension** | `createExtension({ attachTo, inputs, output, configSchema, factory })` | The building block. Attaches to a parent's named input to form the app tree. |
| **Extension data ref** | `createExtensionDataRef<T>()` | A typed, shared key describing a piece of data flowing between extensions. `coreExtensionData` provides the common ones: `reactElement`, `routePath`, `routeRef`, `title`, `icon`. |
| **Extension input** | `createExtensionInput([refs], { singleton, optional })` | A parent's collection point; gathers the outputs of everything attached to it. |
| **Blueprint** | `createExtensionBlueprint({ kind, … })` → `.make({ name, params })` | A reusable extension template. Provided: `PageBlueprint`, `ApiBlueprint`. |
| **Plugin** | `createFrontendPlugin({ pluginId, extensions, routes, externalRoutes })` | A unit of delivery; its extensions attach into the tree. |
| **Module** | `createFrontendModule({ pluginId, extensions })` | Extends another plugin without owning it. |
| **Utility API** | `createApiRef<T>()` + `ApiBlueprint` + `useApi` | A typed service contract, dependency-injected and overridable. |
| **Route ref** | `createRouteRef()` / `createExternalRouteRef()` | A handle a plugin links to instead of a hard-coded URL; resolved by the app. |

**Extension id** follows `[<kind>:][<namespace>][/][<name>]`, where namespace
defaults to the plugin id — e.g. `page:home/settings`, `api:app/app-info`.

---

## 3. Packages

### Framework

| Package | Role |
| --- | --- |
| `@octopus/core-plugin-api` | The extension **engine**: `createExtension`, data refs, inputs, `createExtensionBlueprint`, `createFrontendPlugin`/`Module`, route refs, `createApiRef`, `ApiProvider`/`useApi`/`useRouteRef`. Ported from `@backstage/frontend-plugin-api`; UI (components/blueprints) removed. |
| `@octopus/core-app-api` | The composition root: `createApp`. Resolves + instantiates the extension tree, builds the utility-API DI container, and the route resolver. |
| `@octopus/core-components` | Ant Design app shell: `AppLayout` (sidebar + header + routed content), `Page`. |
| `@octopus/app-defaults` | The builtin `app` plugin (the `app/layout` extension), `PageBlueprint`, and a sample `appInfoApiRef`. |
| `@octopus/dynamic-loader` | Host-side Module Federation runtime loader (`loadRemoteFeatures`). |
| `@octopus/dev-utils` | `createDevApp` — runs a single plugin standalone inside the default shell (`dev/index.tsx`). |
| `@octopus/cli` | `octopus new plugin` — generates plugin packages by role. |

### Vendored utilities (framework-agnostic, ported from Backstage)

`@octopus/types`, `@octopus/errors`, `@octopus/config` (`ConfigReader`),
`@octopus/filter-predicates` (the `if:` conditions), `@octopus/version-bridge`
(cross-bundle global-singleton React contexts), and the internal opaque-type
helper `@octopus/internal-opaque` (the opaque-type *bridges* live inside
`@octopus/core-plugin-api`).

### Examples

`apps/portal` (host), `plugins/plugin-home` (static plugin: pages, DI, routing),
`plugins/plugin-remote-demo` (Module Federation remote).

---

## 4. The composition root — `createApp`

`createApp(options)` (in `@octopus/core-app-api`) runs this pipeline:

1. **Resolve config** — `new ConfigReader(options.config ?? {})`.
2. **Resolve the tree** — `resolveAppNodeSpecs` collects every feature's
   extensions (plus the builtin `Root`), applies enable/disable + overrides;
   `resolveAppTree('root', …)` links them into a tree via their `attachTo`.
3. **Collect routes** — `collectRouteIds(features)` gathers route refs;
   `resolveRouteBindings(options.bindRoutes, config, …)` resolves
   `ExternalRouteRef → RouteRef` bindings. A `RouteResolutionApiProxy` is created
   now (so `useRouteRef` can read it) but stays uninitialised.
4. **Build the DI container** — a `FrontendApiResolver` over two registries:
   - *primary*: utility APIs contributed by plugins (collected after step 5),
   - *secondary* (fallback): builtin `configApi`, `fetchApi`, and the route
     resolution proxy. Plugins can override any builtin (primary wins).
5. **Instantiate** — `instantiateAppNodeTree(tree.root, apis, …)` runs every
   extension factory bottom-up, wiring each input to the outputs attached to it.
6. **Finalise** — register the now-instantiated API factories into the primary
   registry; build the real route resolver from
   `extractRouteInfoFromAppNode(tree.root)` and `initialize` the proxy.

It returns an `OctopusApp`:

```ts
interface OctopusApp {
  tree: AppTree;                 // the instantiated extension tree
  apis: ApiHolder;               // the DI container
  errors: AppWiringError[];      // collected wiring errors
  getRootElement(): JSX.Element | undefined; // <ApiProvider>{<AppLayout/>}</ApiProvider>
}
```

### The builtin `Root`

A builtin extension resolved to the reserved id `root`, with two inputs:

- `app` (singleton `reactElement`) — the application's React root, provided by
  `app-defaults`' `app/layout` extension.
- `apis` (`ApiBlueprint` factories) — utility APIs, collected into the DI
  container.

### Why the proxy / two-phase wiring

Both the API container and the route resolver face a chicken-and-egg: they're
needed *during* render but can only be fully built *after* the tree exists.
Octopus resolves this with laziness — the `FrontendApiResolver` only builds an
API on first `get()` (at render time), and the `RouteResolutionApiProxy` is
injected first and `initialize`d once route paths are known. Result: extension
factories must not resolve routes/APIs at instantiation time; render-time
`useApi`/`useRouteRef` work normally.

---

## 5. Rendering & the UI layer

`app-defaults` provides the `app` plugin, whose `app/layout` extension:

- attaches to `root`'s `app` input,
- collects page extensions on its `routes` input (each page outputs a
  `routePath`, `reactElement`, and optionally `title`, `icon`, `routeRef`),
- renders `@octopus/core-components`' `<AppLayout/>`: an antd `Layout` with a
  sidebar `Menu`, a header, and a React Router `<Routes>` of the pages.

The **sidebar nav is auto-derived** from pages that declare a `title` — there is
no separate nav-item blueprint (matching Backstage's current model, where
standalone nav items are legacy).

Pages are contributed with `PageBlueprint.make({ name, params: { path, title,
icon, element, routeRef } })`.

---

## 6. Utility APIs & dependency injection

A utility API is a typed contract (`createApiRef<T>()`). Implementations are
provided with `ApiBlueprint` (an extension attached to `root`'s `apis` input) and
consumed anywhere with `useApi(ref)`.

- The DI container (`FrontendApiResolver`) resolves lazily, handling inter-API
  dependencies and detecting cycles.
- `createApp` wraps the rendered root in an `<ApiProvider>` (a `version-bridge`
  global-singleton React context) so `useApi` works across bundle boundaries.
- **Builtins, no backend required:** `configApi` (a `ConfigReader` over the
  static `createApp({ config })`), `fetchApi` (a thin `fetch` wrapper),
  `errorApi` (console), and i18n — `appLanguageApi` + `translationApi` (an
  i18next runtime driven by `i18n.availableLanguages` / `i18n.defaultLanguage`
  config) — are registered as overridable fallbacks.

### i18n

Plugins declare a `TranslationRef` (`createTranslationRef({ id, messages,
translations })`) with default (English) messages and lazy per-language loaders,
and read it with `useTranslationRef(ref)` → `{ t }`. Switching language via
`appLanguageApi.setLanguage(...)` lazy-loads the target bundle and re-renders.
The runtime is the ported i18next-based `translationApi`.

> Apps and plugin dev-harnesses that bundle `@octopus/core-app-api` must declare
> `i18next` + `zen-observable` (the CLI adds them); the bundler resolves these
> transitive deps from the consuming package.

```ts
const config = useApi(configApiRef);
config.getOptionalString('organization.name');
```

---

## 7. Decoupled routing

Plugins link to each other through **route refs**, never hard-coded paths:

- A page exposes a `RouteRef` (`createRouteRef()`), declared on the plugin via
  `createFrontendPlugin({ routes: { … } })`.
- `useRouteRef(ref)` returns a function that yields the concrete path, resolved
  by walking the tree (`extractRouteInfoFromAppNode` → `RouteResolver`).
- **External route refs** (`createExternalRouteRef()`) let a plugin reference a
  route it doesn't own; the integrator wires them with
  `createApp({ bindRoutes: ({ bind }) => bind(plugin.externalRoutes, { … }) })`.

This means a plugin can move its pages or change paths without breaking links
from other plugins.

---

## 8. Static vs. dynamic plugins (Module Federation)

A plugin is **written once** and delivered two ways, both through `createApp`:

- **Static** — imported and passed in `features`. Bundled with the host.
- **Dynamic** — built independently as an MF remote exposing `./plugin`
  (default export = the plugin). `@octopus/dynamic-loader` reads a runtime
  manifest, loads each remote, checks the `$$type` brand, and returns the
  features. Adding a plugin = editing the manifest; the host is not rebuilt.

**Shared singletons are mandatory.** Host and remotes must share one instance of
each identity-critical package — `react`, `react-dom`, `react-router-dom`,
`antd`, and `@octopus/core-plugin-api` / `version-bridge` / `internal-opaque`
— or a remote's plugin carries *different* brand/data-ref
objects and silently fails to wire. Details in
[dynamic-plugins.md](./dynamic-plugins.md).

---

## 9. Plugin package roles

To share code between plugins without circular dependencies, packages carry an
`octopus.role` marker (mirroring Backstage's `backstage.role`):

| Package | `octopus.role` | Contains | React? |
| --- | --- | --- | --- |
| `plugin-<name>` | `frontend-plugin` | The plugin (extensions, pages) | yes |
| `plugin-<name>-react` | `web-library` | Shared FE surface for other plugins: api refs, components | yes |
| `plugin-<name>-common` | `common-library` | Isomorphic types/constants (backend-safe) | no |

The `@octopus/cli` generates these on demand:
`octopus new plugin <name> [--react] [--common]`. See
[writing-a-plugin.md](./writing-a-plugin.md).

---

## 10. Stack & tooling

- **pnpm** workspaces + **Turborepo**; packages are consumed as TypeScript
  source (no per-package build step) — bundlers compile them.
- **Rsbuild / Rspack** with `@module-federation/rsbuild-plugin` for the host and
  remotes (first-class Module Federation + HMR).
- **React 18** + **Ant Design 5**, **TypeScript**, **Vitest** (+ jsdom) for
  tests, **Playwright** for the Module Federation end-to-end check
  (`scripts/mf-e2e.sh`).
