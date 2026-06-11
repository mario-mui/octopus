# @octopus/dev-console

Dev-only auto-login against an Alauda console (dex) backend, so the app runs
against **real backend data** in local development without manually logging in.

It is a faithful port of the upstream `custom-webpack` dev console, adapted to
rsbuild and native `fetch`. With no config it is a **no-op** — the app falls
back to its built-in mock auth.

---

## Quick start

1. **Add the plugin** to the host's rsbuild config:

   ```ts
   // apps/portal/rsbuild.config.ts
   import { pluginDevConsole } from '@octopus/dev-console';

   export default defineConfig({
     plugins: [pluginReact(), pluginDevConsole() /* , ... */],
   });
   ```

2. **Create `.consolerc.yaml`** at the repo root (copy `.consolerc.demo.yaml`
   and fill it in). It holds a real password, so it is **gitignored** — only the
   `.consolerc.demo.yaml` template is committed.

   ```yaml
   authentication:
     product: console # API segment + dex product
   console:
     api_address: 'https://your-backend.example.net'
     login: you@example.com
     password: your-password
   ```

3. **Forward port `8082`** ⚠️ (see [Port forwarding](#port-forwarding-important)).

4. `pnpm dev`. On first load you are redirected through dex, logged in
   automatically, and land back signed in as the real user.

> The plugin only activates when `.consolerc` has `console.login` **and**
> `console.password`. Otherwise it does nothing.

---

## How it works

```
browser                rsbuild :3000            dev-console :8082          backend (https)
   │                        │                          │                        │
   │ GET /console/api/v2/token/info (no Bearer)         │                        │
   ├───────────────────────►│ proxy ──────────────────►│ proxy ────────────────►│ 401
   │ 401 → no session       │                          │                        │
   │                        │                          │                        │
   │ location.href = :8082/dex/auth?redirect_uri=:3000/ │  (top-level navigation)│
   ├──────────────────────────────────────────────────►│ proxyDex: full dex     │
   │                        │                          │  login server-side ────►│
   │ 301 → :3000/?code=… (+ session cookies)            │◄───────────────────────┤
   │◄──────────────────────────────────────────────────┤                        │
   │                        │                          │                        │
   │ GET /console/api/v2/token/callback?code=…          │                        │
   ├───────────────────────►│ proxy ──────────────────►│ proxy ────────────────►│ { id_token }
   │ { id_token } → localStorage                        │                        │
   │                        │                          │                        │
   │ GET …/token/info  (Authorization: Bearer …)        │                        │
   ├───────────────────────►│ proxy ──────────────────►│ proxy ────────────────►│ 200 → signed in
```

Key points:

- The dev console runs as a **standalone proxy on `:8082`** (like the upstream
  console's `:8080`), started before the dev server.
- `/console/api` and `/api` are proxied through rsbuild to `:8082`, which adds
  the credentials, performs the server-side dex login, and forwards to the
  backend.
- The **sign-in redirect goes straight to `:8082/dex/auth`** — a fixed URL, so
  the app never depends on a flaky `token/login` round-trip to know where to go.
- The backend is **token-based**: the dex `?code` is exchanged at
  `token/callback` for an **`id_token` (JWT)** kept in `localStorage`, and every
  `/console/api` request carries `Authorization: Bearer <id_token>`.

### Frontend pieces (in `apps/portal`)

- **`backendAuth.ts`** — installed at bootstrap in backend mode:
  - exchanges the dex `?code` for an `id_token` (and cleans the URL),
  - patches `fetch` to attach `Authorization: Bearer` to backend API calls.
- **`UserIdentity` (backend mode)** — the `id_token` JWT _is_ the session: the
  user is read from its claims; `token/info` is used only to **validate** (a
  `401` clears the token and re-logs-in; a network error trusts the local
  token). The sign-in URL is computed synchronously, avoiding redirect races.
- **`__OCTOPUS_DEV_CONSOLE__`** — a build-time global the plugin injects: the
  proxy origin (`http://localhost:8082`) in dev, `false` in production builds
  (so the backend branch is dropped from prod bundles).

---

## Port forwarding (important)

The browser navigates **directly** to `http://localhost:8082/dex/auth`, so in a
container / Codespace / devpod you must **forward port `8082`** in addition to
the dev-server port — exactly as the upstream console requires forwarding its
`:8080`.

Verify it: opening `http://localhost:8082/` should print
`octopus dev console is running`. If it doesn't, the browser can't reach the
proxy and sign-in will loop.

---

## Configuration (`.consolerc.yaml`)

| Key | Required | Meaning |
| --- | --- | --- |
| `console.api_address` | ✅ | Backend base URL (https). |
| `console.login` | ✅ | Username for auto-login. |
| `console.password` | ✅ | Password (RSA-encrypted against dex's pubkey, base64 fallback). |
| `console.envs` | — | Passed through; not used by the proxy. |
| `authentication.product` | — | API segment / dex product. Defaults to `console`. |

Plugin options: `pluginDevConsole({ port })` — the proxy port (default `8082`).

---

## Troubleshooting

- **`http://localhost:8082/` not reachable** → forward port `8082`.
- **Sign-in loops / "Sign-in did not complete"** → usually stale state from a
  previous failed attempt: clear `localStorage` + `sessionStorage` + cookies and
  reload, or click **Retry sign-in**.
- **`[dev-console] dex auto-login failed`** in the terminal → wrong
  password, or the backend requires a captcha (not auto-solved — log in
  manually that once).
- **`[dev-console]` logs are in the terminal**, not the browser console.
- Changes to the dev console require a **full `pnpm dev` restart** (it is a
  long-running process; HMR does not reload it).

---

## Limitations

- **Captcha** is not auto-solved (the upstream OCR is not ported); the dex page
  is surfaced for manual login if required.
- **WebSocket** backend APIs (e.g. k8s watch) are not proxied yet.
- Intended for **development only**. Production builds disable it entirely.
