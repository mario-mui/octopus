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
      const data = (await res.json()) as { id_token?: string };
      if (typeof data.id_token === 'string' && data.id_token) {
        window.localStorage.setItem(STORAGE_KEY, data.id_token);
      } else {
        console.error('[auth] token callback returned no id_token');
      }
    } else {
      console.error('[auth] token callback failed:', res.status);
    }
  } catch (err) {
    console.error('[auth] token callback error:', err);
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
