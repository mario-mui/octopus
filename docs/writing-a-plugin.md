# Writing a plugin

## Generate one

```bash
node packages/cli/bin/octopus.mjs new plugin hello
# or with companion libraries:
node packages/cli/bin/octopus.mjs new plugin reports --react --common
pnpm install
```

## Package roles

Plugins follow a role convention (marked by the `octopus.role` field), so shared
code can be reused across plugins without circular dependencies:

| Package | `octopus.role` | Contains | Depends on React? |
| --- | --- | --- | --- |
| `plugin-<name>` | `frontend-plugin` | The plugin: extensions + pages | yes |
| `plugin-<name>-react` | `web-library` | Shared FE surface for *other* plugins: `apiRef`s, components, blueprints | yes |
| `plugin-<name>-common` | `common-library` | Isomorphic types/constants (safe for a future backend) | no |

Rule of thumb: anything another plugin needs to import goes in `-react` (if it
touches React) or `-common` (if it doesn't). The plugin package itself is a leaf
— nothing should import from it.

## Anatomy

```
plugins/plugin-hello/
├── src/
│   ├── HelloPage.tsx     # your UI
│   ├── plugin.tsx        # default-exports createFrontendPlugin({ pluginId, extensions })
│   └── index.ts          # re-exports the plugin (named + default)
├── dev/
│   └── index.tsx         # standalone dev entry: createDevApp({ features: [plugin] })
└── rsbuild.config.ts     # build as a Module Federation remote
```

## Run it standalone

```bash
pnpm --filter @octopus/plugin-hello dev
```

`dev/index.tsx` mounts the plugin inside the **default Octopus app shell**
(layout, routing, DI) via `@octopus/dev-utils`, so you develop it in isolation
but with the full framework around it:

```tsx
// dev/index.tsx
import { createDevApp } from '@octopus/dev-utils';
import helloPlugin from '../src';

createDevApp({ features: [helloPlugin] });
```

A page is contributed with `PageBlueprint`, which carries the route path, title,
and icon. The sidebar nav is auto-derived from pages that declare a title.

```tsx
const helloPage = PageBlueprint.make({
  name: 'hello',
  params: { path: '/hello', title: 'Hello', icon: <SmileOutlined />, element: <HelloPage /> },
});

export default createFrontendPlugin({ pluginId: 'hello', extensions: [helloPage] });
```

## Use it — statically

```tsx
// apps/portal/src/App.tsx
import { helloPlugin } from '@octopus/plugin-hello';

createApp({ features: [appPlugin, helloPlugin /* … */] });
```

## Use it — as a dynamic remote

```bash
pnpm --filter @octopus/plugin-hello build   # → dist/mf-manifest.json (exposes ./plugin)
```

Then list it in `apps/portal/public/remotes.json` and the host loads it at
runtime — no host rebuild. See [dynamic-plugins.md](./dynamic-plugins.md).

## Provide / consume a utility API

Define the ref in the `-react` library so others can use it:

```ts
export const helloApiRef = createApiRef<HelloApi>({ id: 'plugin.hello' });
```

Provide an implementation with `ApiBlueprint` (attaches to the app's `apis`
input) and consume it anywhere with `useApi(helloApiRef)`.
