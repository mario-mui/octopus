# @octopus/console-shared-components (per-remote / evolving)

The **per-remote, evolving** console layer — shared console components that are
**not standalone** and **change relatively often**. Unlike the sibling
`@octopus/console-core-components` (a stable layer meant to be shared as a single
MF copy), this package is **bundled into each consuming remote**, so it can
change freely without coordinating a single shared version across the host and
all remotes.

> **Currently empty** — a scaffold for upcoming shared, fast-moving console
> components. See the rule below before adding anything.

| Package | Nature | Holds |
|---------|--------|-------|
| `@octopus/console-core-components` | **standalone**, shared as one MF copy, **stable / low-churn** | foundational, widely-reused building blocks |
| **`@octopus/console-shared-components` (here)** | **not standalone**, bundled per-remote, **changes often** | higher-level console widgets that evolve |

## The rule — does it belong here?

Put a component/hook in **this package** if:

- ✅ It is shared by **two or more** plugins/apps (otherwise keep it inside the
  one plugin that uses it), **and**
- ✅ It is a **higher-level / fast-moving** console widget — it changes often
  enough that you don't want every change to ripple through a single shared MF
  copy.

If it is **foundational and stable** (low-churn, everything should agree on one
instance) → put it in **`@octopus/console-core-components`** instead.

## Dependency direction

This package **may** depend on `@octopus/console-core-components`; the reverse is
forbidden. The arrow only points one way: shared → core.

## Adding something here

1. Apply the rule above (one-plugin-only → that plugin; stable/foundational → core).
2. Add `src/<name>/…` + a barrel `src/<name>/index.ts`; re-export from `src/index.ts`.
3. `pnpm --filter @octopus/console-shared-components typecheck`.
