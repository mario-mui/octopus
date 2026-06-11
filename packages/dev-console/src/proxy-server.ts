/*
 * The dev-console proxy server. It is a faithful, fetch-based port of the
 * Alauda custom-webpack dev console:
 *
 *  - It proxies `/console/api`, `/api` and `/dex` (static) to the real backend
 *    (`api_address` from `.consolerc`), passing the browser's cookies through.
 *  - It intercepts `…/api/v2/token/login` and rewrites the returned `auth_url`
 *    to its own `/dex/auth` endpoint.
 *  - When the browser hits `/dex/auth`, it performs the whole dex login flow
 *    server-side using the configured credentials, then 301-redirects back to
 *    the app with the backend session cookies injected.
 *
 * Captcha is NOT auto-solved (the original used OCR): if the backend demands a
 * captcha, the dex response is surfaced so the user can log in manually.
 */
import http from 'node:http';
import { URL } from 'node:url';

import httpProxy from 'http-proxy';

import type { ConsoleConfig } from './config';
import {
  DEFAULT_BROWSER_URL,
  DEFAULT_PRODUCT,
  OK_STATUS,
  REDIRECT_STATUS,
  REDIRECT_URI,
  UNAUTHORIZED_STATUS,
} from './constants';
import { encryptPassword } from './crypto';
import { getSetCookies, parseJson } from './http';

const JSON_HEADER = { 'content-type': 'application/json' };

const proxy = httpProxy.createProxyServer({ ws: true });

proxy.on('error', (err, _req, res) => {
  console.error('[dev-console] proxy error:', err);
  const response = res as http.ServerResponse;
  if (response.writeHead && !response.headersSent) {
    response.writeHead(502);
  }
  response.end?.(err.message);
});

// Strip Domain, Secure and SameSite so the browser keeps backend cookies for
// localhost over plain HTTP. Crucially, `SameSite=None` without `Secure` is
// rejected by browsers — dropping SameSite lets it default to Lax, which works
// for same-origin requests and avoids a sign-in loop.
const stripCookieAttrs = (cookie: string): string =>
  cookie
    .split(';')
    .filter((part, i) => {
      if (i === 0) {
        return true;
      }
      const t = part.trim().toLowerCase();
      return (
        !t.startsWith('domain=') && t !== 'secure' && !t.startsWith('samesite=')
      );
    })
    .join(';');

proxy.on('proxyRes', proxyRes => {
  const cookies = proxyRes.headers['set-cookie'];
  if (cookies) {
    proxyRes.headers['set-cookie'] = cookies.map(stripCookieAttrs);
  }
});

let devConsoleGuardsInstalled = false;

const trimSlash = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);

const matchUrl = (url: string, toMatch: RegExp | string) => {
  const path = url.split('?')[0];
  return typeof toMatch === 'string' ? path === toMatch : toMatch.test(path);
};

const combineUrl = (url: string, search: string) =>
  `${url}${url.includes('?') && search ? '&' + search.slice(1) : search}`;

/** The browser origin, derived from the request so redirects come back here. */
function browserOrigin(req: http.IncomingMessage): string {
  const { referer, origin } = req.headers;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // fall through
    }
  }
  if (typeof origin === 'string' && origin) {
    return origin;
  }
  return DEFAULT_BROWSER_URL;
}

function apiPrefixes(config: ConsoleConfig) {
  const apiAddress = trimSlash(config.console.api_address);
  const product = config.authentication?.product ?? DEFAULT_PRODUCT;
  return {
    apiAddress,
    base: `${apiAddress}/${product}`,
    apiWithDex: `${apiAddress}/dex`,
  };
}

/** Perform the dex login flow server-side and redirect back with cookies. */
async function proxyDex(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: ConsoleConfig,
): Promise<void> {
  const url = req.url!;
  const { login, password } = config.console;
  const { apiAddress, base, apiWithDex } = apiPrefixes(config);

  // 1. Ask the backend where to authenticate.
  const tokenLoginRes = await fetch(`${base}/api/v2/token/login`, {
    headers: { Referer: base },
  });
  const { auth_url } = (await tokenLoginRes.json()) as { auth_url: string };
  const tokenLoginCookies = getSetCookies(tokenLoginRes.headers).map(
    stripCookieAttrs,
  );

  // 2. Fetch the dex login page and detect dex v1 vs v2.
  const dexBody = await (await fetch(auth_url)).text();
  let loginUrl = /\/dex\/auth\/local\?req=[^"]+/i.exec(dexBody)?.[0];
  const isDex2 = !loginUrl;
  if (isDex2) {
    const authorize = (await (
      await fetch(`${apiWithDex}/api/v1/authorize?${new URL(auth_url).search.slice(1)}`)
    ).json()) as { req: string };
    loginUrl = `/dex/api/v1/authorize/local?req=${authorize.req}`;
  }

  // 3. Encrypt the password and submit the login form.
  const encrypt = await encryptPassword(apiWithDex, password ?? '');
  const loginRes = await fetch(`${apiAddress}${loginUrl}`, {
    method: 'POST',
    redirect: 'manual',
    headers: isDex2
      ? JSON_HEADER
      : { 'content-type': 'application/x-www-form-urlencoded' },
    body: isDex2
      ? JSON.stringify({ account: login, password: encrypt })
      : new URLSearchParams({ login: login ?? '', encrypt }).toString(),
  });
  const loginBody = await loginRes.text();
  const nextUrl = isDex2
    ? parseJson<{ redirect_url: string }>(loginBody)?.redirect_url
    : loginRes.headers.get('location') ?? undefined;
  const loginCookies = getSetCookies(loginRes.headers).map(stripCookieAttrs);

  // Login failed (wrong password or a captcha we don't auto-solve): surface it.
  if (!nextUrl) {
    console.warn(
      '[dev-console] dex auto-login failed (wrong password or captcha?); surfacing the dex response',
    );
    res.writeHead(loginRes.status, { 'content-type': 'text/html' });
    res.end(
      loginBody ||
        'Auto-login failed. The backend may require a captcha — please log in manually.',
    );
    return;
  }

  // 4. Resolve the final redirect target.
  let redirectUrl: URL;
  if (isDex2) {
    redirectUrl = new URL(nextUrl, apiAddress);
  } else {
    const approve = await fetch(`${apiAddress}${nextUrl}`, { redirect: 'manual' });
    redirectUrl = new URL(approve.headers.get('location')!, apiAddress);
  }

  const redirectUri =
    new URL(url, DEFAULT_BROWSER_URL).searchParams.get(REDIRECT_URI) ??
    browserOrigin(req) + '/';

  const location = combineUrl(redirectUri, redirectUrl.search);
  res.writeHead(REDIRECT_STATUS, {
    location,
    'cache-control': 'no-cache',
    'set-cookie': [...tokenLoginCookies, ...loginCookies],
  });
  res.end();
}

/** Proxy `…/token/login`, rewriting `auth_url` to our `/dex/auth` endpoint. */
async function handleTokenLogin(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: ConsoleConfig,
  selfOrigin: string,
): Promise<void> {
  const { base } = apiPrefixes(config);
  const appOrigin = browserOrigin(req);
  const originUrl = req.url!.replace(/^\/console/, '');

  const backend = await fetch(`${base}${originUrl}`, {
    headers: {
      referer: base,
      ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
    },
  });
  const cookies = getSetCookies(backend.headers).map(stripCookieAttrs);
  const headers: http.OutgoingHttpHeaders = { ...JSON_HEADER };
  if (cookies.length) {
    headers['set-cookie'] = cookies;
  }

  // auth_url points straight at the dev-console proxy port (like the upstream
  // console's getProxyUrl), so the browser navigates directly to it for the dex
  // login. Cookies are not port-specific, so the session still applies to the
  // app origin. The proxy port must be reachable from the browser (forward it).
  const authUrl = `${selfOrigin}/dex/auth?${REDIRECT_URI}=${appOrigin}/`;

  if (backend.status === UNAUTHORIZED_STATUS) {
    res.writeHead(OK_STATUS, headers);
    res.end(JSON.stringify({ auth_url: authUrl }));
    return;
  }

  const body = await backend.text();
  const json = parseJson<Record<string, unknown>>(body);
  if (!json) {
    res.writeHead(backend.status, headers);
    res.end(body);
    return;
  }
  res.writeHead(OK_STATUS, headers);
  res.end(JSON.stringify({ ...json, auth_url: authUrl }));
}

/** Proxy `…/token/callback`, logging the backend response (id_token exchange). */
async function handleTokenCallback(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: ConsoleConfig,
): Promise<void> {
  const { base } = apiPrefixes(config);
  const originUrl = req.url!.replace(/^\/console/, '');
  const backend = await fetch(`${base}${originUrl}`, {
    headers: {
      Accept: 'application/json',
      referer: base,
      ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
    },
  });
  const body = await backend.text();
  const cookies = getSetCookies(backend.headers).map(stripCookieAttrs);
  const headers: http.OutgoingHttpHeaders = {
    'content-type': backend.headers.get('content-type') ?? 'application/json',
  };
  if (cookies.length) {
    headers['set-cookie'] = cookies;
  }
  res.writeHead(backend.status, headers);
  res.end(body);
}

function requestHandler(config: ConsoleConfig, port: number) {
  const { apiAddress, base } = apiPrefixes(config);
  const selfOrigin = `http://localhost:${port}`;

  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = req.url ?? '/';

    if (url === '/') {
      res.writeHead(OK_STATUS);
      res.end('octopus dev console is running');
      return;
    }

    const fail = (err: unknown) => {
      console.error('[dev-console] request failed:', err);
      if (!res.headersSent) {
        res.writeHead(502, JSON_HEADER);
      }
      res.end(JSON.stringify({ error: String(err) }));
    };

    delete req.headers.host;
    delete req.headers.origin;

    if (matchUrl(url, /^\/(?:console\/)?api\/v2\/token\/login/)) {
      handleTokenLogin(req, res, config, selfOrigin).catch(fail);
      return;
    }
    if (matchUrl(url, /^\/(?:console\/)?api\/v2\/token\/callback/)) {
      handleTokenCallback(req, res, config).catch(fail);
      return;
    }
    if (
      url.startsWith('/dex/') &&
      !matchUrl(url, /\.(?:css|js|ico|jpe?g|svg|png)$/)
    ) {
      proxyDex(req, res, config).catch(fail);
      return;
    }
    if (url.startsWith('/console/api/')) {
      proxy.web(req, res, { target: apiAddress, changeOrigin: true, secure: false });
      return;
    }
    if (url.startsWith('/api/')) {
      proxy.web(req, res, { target: base, changeOrigin: true, secure: false });
      return;
    }

    // Everything else (e.g. dex static assets) goes to the backend root.
    proxy.web(req, res, { target: apiAddress, changeOrigin: true, secure: false });
  };
}

/**
 * Start the standalone dev-console proxy server (like the upstream console's
 * dev console on :8080). Resolves with the server, or `undefined` if the port
 * is already taken so a second dev server does not crash.
 */
export function startDevConsole(
  config: ConsoleConfig,
  port: number,
): Promise<http.Server | undefined> {
  // A single failing request must not take down the dev server.
  if (!devConsoleGuardsInstalled) {
    devConsoleGuardsInstalled = true;
    process.on('uncaughtException', err =>
      console.error('[dev-console] uncaught exception (kept alive):', err),
    );
    process.on('unhandledRejection', err =>
      console.error('[dev-console] unhandled rejection (kept alive):', err),
    );
  }

  return new Promise(resolve => {
    const handler = requestHandler(config, port);
    const server = http.createServer((req, res) => {
      try {
        handler(req, res);
      } catch (err) {
        console.error('[dev-console] handler threw:', err);
        if (!res.headersSent) {
          res.writeHead(502);
        }
        res.end();
      }
    });

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.info(
          `[dev-console] port ${port} is in use; assuming a dev console is already running`,
        );
      } else {
        console.error('[dev-console] server error:', err);
      }
      resolve(undefined);
    });

    server.listen(port, () => {
      console.info(
        `[dev-console] proxy on http://localhost:${port} → ${trimSlash(
          config.console.api_address,
        )} (login: ${config.console.login})`,
      );
      resolve(server);
    });
  });
}
