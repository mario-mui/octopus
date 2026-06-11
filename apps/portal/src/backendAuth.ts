/*
 * Browser-side glue for the token-based backend (dex). Only used in dev-console
 * (backend) mode. Two responsibilities:
 *
 *  1. Exchange the dex `?code` (or `?id_token`) on the callback URL for an
 *     `id_token` via the backend token-callback endpoint, and store it.
 *  2. Patch `fetch` so every backend API request carries
 *     `Authorization: Bearer <id_token>` — the backend rejects calls without it.
 */
const STORAGE_KEY = 'id_token';
const CALLBACK_URL = '/console/api/v2/token/callback';
const API_PREFIXES = ['/console/api', '/api'];
const AUTH_PARAMS = ['code', 'state', 'id_token', 'session_state'];

const TRAIL_KEY = 'octopus.authlog';

/**
 * Append a diagnostic entry to localStorage so it survives the cross-origin
 * redirects (which drop console logs even with "Preserve log"). Inspect it in
 * DevTools → Application → Local Storage → `octopus.authlog`.
 */
export function authLog(msg: string, data?: unknown): void {
  console.info('[auth]', msg, data ?? '');
  try {
    const trail = JSON.parse(
      window.localStorage.getItem(TRAIL_KEY) ?? '[]',
    ) as unknown[];
    trail.push({ t: new Date().toISOString(), msg, data });
    window.localStorage.setItem(TRAIL_KEY, JSON.stringify(trail.slice(-40)));
  } catch {
    // ignore storage errors
  }
}

function isBackendApi(url: string): boolean {
  try {
    const path = new URL(url, window.location.origin).pathname;
    return API_PREFIXES.some(prefix => path.startsWith(prefix));
  } catch {
    return false;
  }
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

/** Attach the stored Bearer token to backend API requests. */
function installBearerInterceptor(): void {
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    const token = window.localStorage.getItem(STORAGE_KEY);
    if (token && isBackendApi(url)) {
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return original(input, { ...init, headers });
    }
    return original(input, init);
  };
}

/** Exchange a dex `?code`/`?id_token` for an id_token, then clean the URL. */
async function exchangeCallbackCode(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const idToken = params.get('id_token');
  authLog('callback check', {
    href: window.location.href,
    hasCode: Boolean(code),
    hasIdToken: Boolean(idToken),
  });
  if (!code && !idToken) {
    return;
  }

  const query = new URLSearchParams();
  if (code) {
    query.set('code', code);
    const state = params.get('state');
    if (state) {
      query.set('state', state);
    }
  } else if (idToken) {
    query.set('id_token', idToken);
  }

  try {
    const res = await window.fetch(`${CALLBACK_URL}?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const token = data.id_token;
      authLog('token/callback ok', {
        status: res.status,
        keys: Object.keys(data),
        hasIdToken: typeof token === 'string' && Boolean(token),
        body: data,
      });
      if (typeof token === 'string' && token) {
        window.localStorage.setItem(STORAGE_KEY, token);
      }
    } else {
      authLog('token/callback failed', {
        status: res.status,
        body: await res.text().catch(() => ''),
      });
    }
  } catch (err) {
    authLog('token/callback error', { error: String(err) });
  }

  // Strip the auth params so a reload doesn't replay a used code.
  for (const key of AUTH_PARAMS) {
    params.delete(key);
  }
  const search = params.toString();
  const clean =
    window.location.pathname +
    (search ? `?${search}` : '') +
    window.location.hash;
  window.history.replaceState({}, '', clean);
}

/** Run before the app mounts: install the interceptor and complete any callback. */
export async function setupBackendAuth(): Promise<void> {
  installBearerInterceptor();
  await exchangeCallbackCode();
}
