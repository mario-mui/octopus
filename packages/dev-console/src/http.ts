/*
 * Small fetch helpers. TLS verification is expected to be disabled for the
 * self-signed backend via NODE_TLS_REJECT_UNAUTHORIZED=0 (the dev environment
 * already sets this); native fetch then talks to the backend directly.
 */

/** Read all Set-Cookie headers, tolerating runtimes without getSetCookie(). */
export function getSetCookies(headers: Headers): string[] {
  const withGetter = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetter.getSetCookie === 'function') {
    return withGetter.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

export async function getJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; json?: T }> {
  const res = await fetch(url, init);
  const text = await res.text();
  return { status: res.status, json: parseJson<T>(text) };
}

export function parseJson<T>(input: string): T | undefined {
  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
}
