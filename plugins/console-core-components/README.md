# @octopus/console-core-components (standalone / MF-shared)

The **standalone, low-churn** console layer. The intent is that the host and
**every Module Federation remote share a single copy** of it, so it holds the
stable foundations that everything should agree on one instance of.

This is one of two sibling packages — pick by the rule below:

| Package | Nature | Holds |
|---------|--------|-------|
| **`@octopus/console-core-components` (here)** | **standalone**, shared as one MF copy, **stable / low-churn** | foundational, widely-reused building blocks |
| `@octopus/console-shared-components` | **not standalone**, bundled per-remote, **changes often** | higher-level console widgets that evolve |

## The rule — does it belong here?

Put a component/hook in **this package** if **both** are true:

- ✅ It is **foundational and widely reused** — many plugins/apps depend on it.
- ✅ It is **stable / low-churn** — it doesn't change often. Because this package
  is meant to be shared as a single instance, changing it ripples to the host
  and all remotes at once, so churn here is expensive.

If it changes frequently, or is a higher-level widget that only some flows use →
put it in **`@octopus/console-shared-components`** instead.

If only **one** plugin will ever use it → keep it in that plugin's
`src/components/`, not in a shared package at all.

## Dependency direction

`console-shared-components` may depend on this package; **this package must never
depend on `console-shared-components`**. The arrow only points one way:
shared → core.

## Module Federation note

"Shared as one copy" is enforced by registering this package as a singleton in
`packages/dynamic-plugin-pack/src/shared.ts`. Do that when a component here
relies on a **single shared instance** across remotes — e.g. a React context read
across the host/remote boundary, or a module-level cache that must be shared.
(Until then a package bundles into each remote independently.)

## Adding something here

1. Apply the rule above (foundational + stable → here; otherwise the sibling package).
2. Add `src/<name>/…` + a barrel `src/<name>/index.ts`; re-export from `src/index.ts`.
3. `pnpm --filter @octopus/console-core-components typecheck`.
