---
name: octopus-plugin
description: >-
  Conventions and hard constraints for building or modifying a frontend plugin /
  library in the Octopus monorepo (React 18 + AntD 5 + Module Federation,
  Backstage-derived extension engine). USE THIS whenever creating a new plugin
  under plugins/*, adding pages/routes/APIs to an existing plugin, wiring a
  Module Federation remote, or touching createFrontendPlugin / PageBlueprint /
  routeRef / apiRef / translationRef. It exists to stop ad-hoc plugin code that
  bypasses the extension system, hardcodes paths, or breaks MF singleton sharing.
---

# Building plugins in Octopus

Octopus is a Backstage-inspired React framework: an app is **composed from
plugins** wired through an extension tree, and every plugin is "write once,
deliver two ways" — imported statically into `createApp`, **or** built as a
Module Federation remote and loaded at runtime (no host rebuild). The extension
engine and route/api/translation refs are derived from Backstage's
`@backstage/frontend-plugin-api`; follow Backstage's plugin discipline, expressed
through Octopus's AntD-based primitives.

The rules below are **constraints**, not suggestions. They keep plugins isolated,
hot-loadable, and decoupled. Violating them is how you "乱写插件".

---

## 0. Before writing anything: scaffold, don't hand-roll

Generate the package skeleton with the CLI — it produces the correct
`package.json` / `tsconfig.json` / `rsbuild.config.ts` / `module-federation.config.ts`
/ `dev/index.tsx` and the role wiring:

```bash
node packages/cli/bin/octopus.mjs new plugin <name> [--react] [--common]
```

Then study the two reference plugins before editing — match their shape exactly:

- **`plugins/acp-cluster-namespace`** — the canonical *small* feature plugin
  (one page, list/detail/create/update). Copy this layout for anything new.
- **`plugins/devops-pipeline`** — the canonical *large* feature plugin (multiple
  pages, `api/`, `components/`, `utils/`, `types/`, nested routes). Copy its
  internal organisation when a plugin grows.

If a pattern you need isn't in one of these, find the closest existing example
and follow it rather than inventing a new approach.

---

## 1. The package-role model (Backstage three-package convention)

A feature splits into up to three packages by role. **Respect the boundaries** —
they are why other plugins can reuse your surface without depending on your guts.

| Package | role | Contents | React? |
|---|---|---|---|
| `@octopus/<name>` (`plugin-<name>`) | frontend-plugin | extensions + pages + internal routing. The deliverable. | yes |
| `@octopus/<name>-react` | web-library | shared FE surface OTHER plugins reuse: `apiRef`s, `routeRef`s, components | yes (peerDep) |
| `@octopus/<name>-common` | common-library | isomorphic types/constants, **no React** (backend-safe) | no |

- Anything another plugin must import (a route ref to link to you, an api ref, a
  shared component) lives in `-react` / `-common`, **never** in the plugin
  package. Importing the plugin package from another plugin is forbidden (§5).
- Source-only libraries (e.g. `console-core-common`, `console-core-components`,
  `code-editor`, `topology`) have `main: src/index.ts`, only a `typecheck`
  script, and declare react/antd as **peerDependencies** — not a build target.

---

## 2. Required file layout (feature remote)

A feature remote MUST have these, and `src/plugin.tsx` MUST exist at that exact
path (Module Federation `exposes` points at it):

```
<plugin>/
├── package.json                 # name @octopus/<name>, private, type module, main src/index.ts
├── tsconfig.json                # extends ../../tsconfig.base.json, noEmit
├── rsbuild.config.ts            # compose(withRemoteMfeConfig(mfe,{port,devEntry}), withBaseConfig())
├── module-federation.config.ts  # { name, exposes:{ './plugin':'./src/plugin.tsx' }, shared }
├── dev/index.tsx                # createDevApp({ features:[plugin] }) — standalone dev
└── src/
    ├── index.ts                 # re-export default + named plugin only
    ├── plugin.tsx               # createFrontendPlugin + PageBlueprint(s)  ← fixed path
    ├── routes.ts                # createRouteRef() for the plugin's mount point(s)
    ├── translation.ts           # createTranslationRef({ id, messages })
    ├── <Feature>Routes.tsx      # internal <Routes> (default export, lazy-loaded by plugin.tsx)
    └── pages/ components/ api/ types/ utils/   # add these as the plugin grows (see devops-pipeline)
```

- `module-federation.config.ts` MUST spread `shared` imported from
  `@octopus/dynamic-plugin-pack` — never redefine the shared map.
- `rsbuild.config.ts` MUST `compose(withRemoteMfeConfig(...), withBaseConfig())`
  from `@octopus/dynamic-plugin-pack`. Don't hand-write rspack config.

---

## 3. Wiring: extensions & blueprints — never mount pages manually

The plugin definition is tiny and loads eagerly; page code is **code-split**.

```tsx
// src/plugin.tsx
const FeatureRoutes = lazy(() => import('./FeatureRoutes'));  // ← code-split point

const featurePage = PageBlueprint.make({
  name: 'features',
  params: {
    path: 'features',                 // sub-path within the view
    title: 'Features',
    icon: <SomeOutlined />,
    view: 'cluster',                  // 'application' | 'cluster' | 'platform' (canonical view id)
    element: <Suspense fallback={<Spin />}><FeatureRoutes /></Suspense>,
    routeRef: featureRouteRef,        // from ./routes
  },
});

export const featurePlugin = createFrontendPlugin({
  pluginId: '<name>',
  routes: { root: featureRouteRef },
  extensions: [featurePage],
});
export default featurePlugin;         // the host's dynamic-loader detects this by its $$type brand
```

**Hard rules:**
- DO contribute pages **only** via `PageBlueprint.make` from `@octopus/app-defaults`.
  The sidebar nav is auto-derived from every page that declares a `title` — there
  is **no** separate nav-item blueprint. To nest pages under one expandable group,
  give them the same `navParent: { id, title, icon }`.
- DO use the real `view` id (`'application'`/`'cluster'`/`'platform'`); the
  blueprint prefixes the view's URL space automatically. Don't hardcode
  `/console/...` prefixes.
- DON'T render pages by importing a plugin's components into the host, calling
  `ReactDOM`, or registering routes outside the extension system.
- DON'T add anything to the static host. **Plugins are discovered dynamically —
  there is no host registry to edit.**

---

## 4. The four decoupling refs — use them, never bypass them

These are the load-bearing Backstage primitives. Bypassing any of them couples
plugins together and breaks hot-loading.

**RouteRef — navigation (`createRouteRef` from `@octopus/core-plugin-api`).**
- One route ref per mount point, declared in `src/routes.ts`, registered in
  `createFrontendPlugin({ routes })`.
- Link **inside** your plugin with react-router relative paths (`<Link to="detail/x">`).
- To link to **another** plugin, import its `routeRef` from its `-react` package
  and resolve it — **NEVER hardcode another plugin's URL string.**

**apiRef + useApi — all data and services (`createApiRef`, `useApi`).**
- Get every client/service through `useApi(SomeApiRef)`. The k8s data layer is
  `useApi(K8sApi | K8sPermissionApi | K8sUtil)` from `@octopus/console-core-common`.
- DON'T `new SomeClient()`, instantiate a fetch client, or call `fetch()`
  directly in a page. Providers are registered once at app level (app-defaults'
  `appPlugin`) and inject the app's auth-aware fetch.
- A plugin that ships its OWN service defines an `apiRef` + a default provider via
  `ApiBlueprint.make` (see `k8sApi.ts`), and exports the ref from its `-react`
  package so consumers and apps can use or override it.

**translationRef — user-facing text (`createTranslationRef`).**
- Declare keys in `src/translation.ts` with English defaults; read them in
  components via `useTranslationRef(ref)`. Other languages are registered by id
  at the host. Don't scatter raw string literals through shipped UI.

**coreExtensionData — only via blueprints.** Don't yield extension data by hand;
use `PageBlueprint`/`ApiBlueprint`. New cross-cutting data needs a new blueprint.

---

## 5. Plugin isolation — no cross-plugin internals

- A plugin MUST NOT deep-import another plugin's files, nor import another plugin
  package at all. Cross-plugin contact happens **only** through published refs in
  `-react`/`-common` packages (route refs, api refs, shared components, types).
- Shared building blocks come from framework packages: `@octopus/core-plugin-api`
  (refs/blueprints/`useApi`/`useTranslationRef`), `@octopus/app-defaults`
  (`PageBlueprint`), `@octopus/core-components` (`Page`, app shell),
  `@octopus/console-core-common` (k8s data layer, types, view helpers).
- Plugin-local deps that aren't identity-critical (e.g. `dagre`, `monaco`,
  domain libs) just bundle into the remote — that's fine and expected.

---

## 6. Module Federation `shared` — don't break the singletons

`packages/dynamic-plugin-pack/src/shared.ts` lists identity-critical packages
that MUST resolve to a single instance across host + every remote (react,
react-dom, react-router-dom, antd, antd-style + @emotion core,
`@octopus/core-plugin-api`, `@octopus/console-core-common`, `@monaco-editor/react`,
and the internal ref/opaque packages).

- DON'T duplicate a shared singleton's logic, fork its types, or import a second
  copy — the host recognises a remote's plugin by the `$$type` brand and shared
  `coreExtensionData` identity; duplication silently breaks plugin detection,
  `useApi` ref matching, and the AntD/emotion style cache.
- If you genuinely need a NEW identity-critical singleton (a ref container both
  host and remotes must agree on), add it to `shared.ts` **and** justify why —
  don't add heavy leaf libs there (note: monaco-editor is deliberately NOT shared;
  the host owns it — see `code-editor/setup`).

---

## 7. Data layer cheat-sheet (k8s)

```ts
const k8sApi = useApi(K8sApi);             // CRUD + watch
const perm   = useApi(K8sPermissionApi);   // checkAccess
const util   = useApi(K8sUtil);            // getName/getNamespace/getDisplayName/getCreator/...

// Resource definition = minimal descriptor (plural + group + version):
const PIPELINE = { type: 'pipelines', apiGroup: 'tekton.dev', apiVersion: 'v1' };
// core group: omit apiGroup; apiVersion defaults to 'v1'. Reuse
// COMMON_RESOURCE_DEFINITIONS where it exists; otherwise define in the plugin's api/ module.

k8sApi.listResource<T>({ cluster, definition, namespace?, keyword? })  // → { items }
k8sApi.getResource<T>({ cluster, definition, name, namespace? })
k8sApi.createResource<T>(...) / updateResource / updateResourceWithRetry / deleteResource
k8sApi.watchResource<T>(...)  // long-poll; abort on unmount
perm.checkAccess({ cluster, definition, verbs:['create','update','delete'], advanced:true })  // → Record<verb,boolean>
```

- Gate Create/Update/Delete controls on `checkAccess` results.
- Fetch in `useEffect` with an `AbortController`; ignore results when
  `signal.aborted`. Report failures with AntD `message.error`. (See
  `NamespaceListPage.tsx` for the canonical pattern.)

---

## 8. UI conventions

- Page shell: wrap each page in `<Page>` from `@octopus/core-components`.
- AntD 5 only for UI (`Table`, `Form`, `Dropdown`, `message`, …); icons from
  `@ant-design/icons`. Theme/colours via AntD tokens (`antd-style` `createStyles`)
  so light/dark + primary follow the app — no hardcoded colours.
- Routing: react-router 6. The plugin owns an internal `<Routes>` (default-exported,
  lazy-loaded from `plugin.tsx`) for its list/detail/create/update split. Use
  relative paths.
- Form/YAML editors: use `<CodeEditor>` from `@octopus/code-editor` (give it an
  explicit height via `style`). Form↔YAML toggle via `Radio.Group` + `yaml`
  parse/stringify. Convert resource↔form-model in a small `model.ts` (see
  `namespaceModel.ts`), don't inline the mapping in the component.

---

## 9. Verify before claiming done

```bash
pnpm --filter @octopus/<name> typecheck      # always
pnpm --filter @octopus/<name> build          # remote builds (exposed ./plugin must stay small/lazy)
pnpm --filter @octopus/<name> dev            # standalone shell on the plugin's dev port
pnpm vitest run plugins/<name>               # if the plugin has tests
```

When changes cross packages, typecheck the whole chain (e.g. a host `build`),
because MF sharing problems only surface at build/runtime, not in a single
`typecheck`.

---

## Pre-flight checklist

- [ ] Scaffolded via the CLI or copied from `acp-cluster-namespace` / `devops-pipeline`.
- [ ] `src/plugin.tsx` exists; pages contributed only via `PageBlueprint.make`.
- [ ] Page code is `React.lazy`-split; `./plugin` bundle stays small.
- [ ] One `routeRef` per mount point; no hardcoded `/console/...` or cross-plugin URLs.
- [ ] All data/services via `useApi(...)`; no `new Client()` / direct `fetch` in pages.
- [ ] User-facing strings go through a `translationRef`.
- [ ] No import of another plugin's package or internals; cross-plugin only via `-react`/`-common` refs.
- [ ] `module-federation.config.ts` spreads `shared`; no shared singleton duplicated.
- [ ] `pnpm --filter @octopus/<name> typecheck` (and `build` for MF) pass.
