# 🐙 Octopus

A Backstage-inspired React framework for composing applications from plugins —
both **statically bundled** and **dynamically loaded via Module Federation**.
UI is built on [Ant Design](https://ant.design/); no Backstage feature plugins
or backend are included.

> The sibling Backstage source tree (parent directory) is kept purely as an
> architectural reference. Octopus is an independent monorepo.

## Attribution

The extension engine and tree-resolution algorithm are derived from
[Backstage](https://backstage.io) (`@backstage/frontend-plugin-api`,
`@backstage/frontend-app-api`, and supporting utilities), © The Backstage
Authors, licensed under the Apache License, Version 2.0. The Material UI layer
was removed and rebuilt on Ant Design. See [NOTICE](./NOTICE) for details.

## Stack

- **pnpm** workspaces + **Turborepo**
- **Rsbuild / Rspack** (first-class Module Federation support)
- **React 18** + **Ant Design 5**
- **TypeScript**

## Layout

```
octopus/
├── apps/
│   └── portal/        # example host application (M0 ✅)
├── packages/          # framework packages
│   ├── core-plugin-api    # createExtension / data refs / blueprints / apiRef / routeRef
│   ├── core-app-api       # createApp: extension-tree wiring + DI container
│   ├── core-components     # antd app shell (AppLayout, Page)
│   ├── app-defaults        # builtin app plugin (layout), PageBlueprint, default APIs
│   ├── dynamic-loader      # Module Federation runtime loader (host side)
│   ├── dev-utils           # createDevApp — run one plugin standalone
│   └── cli                 # `octopus new plugin` — plugin generator
├── plugins/           # example plugins (plugin-home, plugin-remote-demo)
└── docs/              # architecture.md, writing-a-plugin.md, dynamic-plugins.md
```

## Documentation

- [docs/architecture.md](./docs/architecture.md) — the extension-tree model and packages
- [docs/writing-a-plugin.md](./docs/writing-a-plugin.md) — create a plugin (and its `-react`/`-common` roles)
- [docs/dynamic-plugins.md](./docs/dynamic-plugins.md) — Module Federation, shared singletons, e2e

## Create a plugin

```bash
node packages/cli/bin/octopus.mjs new plugin hello            # the plugin
node packages/cli/bin/octopus.mjs new plugin reports --react --common
```

A plugin is **written once** and delivered two ways: imported statically into
`createApp`, or built as a Module Federation remote and loaded at runtime.

## Develop

All commands run from `octopus/` (isolated from the parent yarn repo).

```bash
pnpm install        # install workspace deps
pnpm dev            # start the host (3000) + remote plugins (HMR) via turbo
pnpm build          # build all packages/apps
pnpm typecheck      # type-check everything
pnpm test           # run the test suite
```

Dynamic-plugin dev: the host (`:3000`) and any remote plugin (e.g. `:3001`) both
run `rsbuild dev` with HMR; the host fetches the remote's manifest at runtime,
so editing either side hot-reloads.

## Roadmap

- **M0** ✅ monorepo skeleton + runnable empty host (Rsbuild + antd)
- **M1** ✅ ported Backstage's extension-tree engine (createExtension / data refs
  / inputs / blueprints) + a lean `createApp` resolver, MUI stripped; 9 packages
  typecheck, 8 wiring tests green
- **M2** ✅ Ant Design app shell (`core-components`) + `app-defaults` (layout
  extension, `PageBlueprint`) + example `plugin-home`; the `portal` host renders
  a real, plugin-driven UI via `createApp`. Sidebar nav is auto-derived from page
  titles (no legacy nav-item blueprint). 11 tests green incl. full jsdom render.
- **M2.5** ✅ Utility-API dependency injection: ported `ApiBlueprint` +
  `ApiProvider` + the `FrontendApiRegistry`/`FrontendApiResolver` container;
  `createApp` collects API factories and exposes `app.apis`. Demo `appInfoApiRef`
  provided via `ApiBlueprint`, consumed in a page via `useApi` (verified end-to-end).
- **M3** ✅ Module Federation: `@octopus/dynamic-loader` loads remote plugins at
  runtime from a manifest; `plugin-remote-demo` is an MF remote; the host shares
  `react`/`react-dom`/`antd`/`@octopus/*` engine packages as singletons. Verified
  with a real-browser e2e (`scripts/mf-e2e.sh`): the remote plugin is loaded,
  routed, rendered, and even consumes a host-provided utility API across the
  federation boundary.
- **M4** ✅ `@octopus/cli` (`octopus new plugin <name> [--react] [--common]`)
  generates plugins by package role (`frontend-plugin` / `web-library` /
  `common-library`); generated plugins are both static-importable and
  remote-buildable. Docs in `docs/`. HMR via Rsbuild dev.
- **M5** ✅ Core utility APIs without a backend: `configApi` (reads the static
  `createApp({ config })`) and `fetchApi`, injected as overridable defaults.
  Decoupled routing: `RouteRef` resolution (`useRouteRef` → concrete path) and
  `ExternalRouteRef` bindings via `createApp({ bindRoutes })`. 24 tests green.
