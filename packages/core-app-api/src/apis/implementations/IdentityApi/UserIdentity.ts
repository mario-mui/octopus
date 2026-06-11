import {
  IdentityApi,
  ProfileInfo,
  UserIdentityInfo,
} from '@octopus/core-plugin-api';

const STORAGE_KEY = 'id_token';
const GUEST_TOKEN = 'octopus-dev-guest';
const UNAUTHORIZED_STATUS = 401;

/** @public */
export interface ResolveIdentityOptions {
  /** When true and no session exists, sign in a local guest user (dev mode). */
  devAutoLogin: boolean;
  /** Fallback sign-in URL; also where signOut sends the user. */
  loginUrl: string;
  /**
   * When set, selects backend mode: the signed-in user is read from the id token
   * stored by the dex callback rather than a local guest. The value is the
   * "current user" endpoint and currently only acts as the mode flag.
   */
  userInfoUrl?: string;
  /**
   * The dex sign-in entry point (e.g. `http://localhost:8082/dex/auth`). The gate
   * redirects an anonymous user straight here — a fixed URL, so no flaky
   * `token/login` round-trip is needed. `?redirect_uri=<origin>/` is appended.
   */
  signInUrl?: string;
}

interface Session {
  token?: string;
  profile: ProfileInfo;
  userEntityRef: string;
}

/**
 * The app's {@link IdentityApi}. Two modes:
 *
 * - **mock** (no `userInfoUrl`): backed by an id token in localStorage; in dev
 *   it auto-creates a local guest session, in prod absence of a token means
 *   signed out. Resolved synchronously.
 * - **backend** (`userInfoUrl` set): the real signed-in user is fetched from the
 *   backend session (cookies). Resolved asynchronously via {@link ensureLoaded}.
 */
export class UserIdentity implements IdentityApi {
  static resolve(options: ResolveIdentityOptions): UserIdentity {
    if (options.userInfoUrl) {
      return new UserIdentity({
        mode: 'backend',
        loginUrl: options.loginUrl,
        signInUrl: options.signInUrl,
        userInfoUrl: options.userInfoUrl,
      });
    }

    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY) ?? undefined
        : undefined;

    let session: Session | undefined;
    if (token) {
      session = token === GUEST_TOKEN ? guestSession() : sessionFromToken(token);
    } else if (options.devAutoLogin && typeof window !== 'undefined') {
      session = guestSession();
      window.localStorage.setItem(STORAGE_KEY, session.token!);
    }
    return new UserIdentity({ mode: 'mock', loginUrl: options.loginUrl, session });
  }

  readonly #mode: 'mock' | 'backend';
  readonly #loginUrl: string;
  readonly #signInBase?: string;
  readonly #userInfoUrl?: string;
  #session: Session | undefined;
  #loaded: boolean;
  #loadPromise: Promise<boolean> | undefined;

  private constructor(opts: {
    mode: 'mock' | 'backend';
    loginUrl: string;
    session?: Session;
    signInUrl?: string;
    userInfoUrl?: string;
  }) {
    this.#mode = opts.mode;
    this.#loginUrl = opts.loginUrl;
    this.#signInBase = opts.signInUrl;
    this.#userInfoUrl = opts.userInfoUrl;
    this.#session = opts.session;
    this.#loaded = opts.mode === 'mock';
  }

  /**
   * Synchronous session check. Returns a boolean when known (mock mode), or
   * `undefined` in backend mode before {@link ensureLoaded} has run — the gate
   * then shows a spinner while it loads.
   */
  isSignedIn(): boolean | undefined {
    return this.#loaded ? this.#session !== undefined : undefined;
  }

  /**
   * Resolve the backend session once. The id token from the dex callback is a
   * JWT carrying the user's claims (used for display). We still validate it with
   * the backend `token/info` so a revoked token redirects cleanly instead of
   * flashing a broken page — but a *network* failure trusts the local token
   * rather than signing the user out on a transient hiccup. Crucially, the
   * sign-in URL ({@link getSignInUrl}) is synchronous, so this async validation
   * can't re-introduce the redirect race that caused the original loop.
   */
  async ensureLoaded(): Promise<boolean> {
    if (this.#loaded) {
      return this.#session !== undefined;
    }
    // Cache the in-flight promise so concurrent/duplicate calls (e.g. React
    // StrictMode's double-invoke) share one result instead of one of them
    // returning the not-yet-resolved session and racing the redirect.
    this.#loadPromise ??= this.#loadBackendSession();
    return this.#loadPromise;
  }

  async #loadBackendSession(): Promise<boolean> {
    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;

      if (!token) {
        return false;
      }
      if (isJwtExpired(token)) {
        window.localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      // Validate with the backend; only a definite 401 means it was revoked.
      if (this.#userInfoUrl) {
        try {
          const res = await fetch(this.#userInfoUrl, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
          });
          if (res.status === UNAUTHORIZED_STATUS) {
            window.localStorage.removeItem(STORAGE_KEY);
            return false;
          }
        } catch {
          // Transient network error: trust the local token, don't sign out.
        }
      }

      this.#session = sessionFromToken(token);
      return true;
    } finally {
      this.#loaded = true;
    }
  }

  /**
   * Where the auth gate sends an anonymous user: the dex entry point with a
   * `redirect_uri` back to this app. Constructed from a fixed URL — no network
   * call — so it can't intermittently fail and bounce to the fallback.
   */
  getSignInUrl(): string {
    if (!this.#signInBase) {
      return this.#loginUrl;
    }
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    return `${this.#signInBase}?redirect_uri=${origin}/`;
  }

  async getProfileInfo(): Promise<ProfileInfo> {
    return this.#session?.profile ?? {};
  }

  async getUserIdentity(): Promise<UserIdentityInfo> {
    if (!this.#session) {
      throw new Error('No signed-in user');
    }
    return {
      type: 'user',
      userEntityRef: this.#session.userEntityRef,
      ownershipEntityRefs: [],
    };
  }

  async getCredentials(): Promise<{ token?: string }> {
    return { token: this.#session?.token };
  }

  async signOut(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    if (this.#mode === 'mock') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.location.href = this.#loginUrl;
  }
}

/** True when the JWT's `exp` claim is in the past. Unknown/absent exp → valid. */
function isJwtExpired(token: string): boolean {
  const claims = decodeJwtClaims(token);
  if (!claims || typeof claims.exp !== 'number') {
    return false;
  }
  return Date.now() >= claims.exp * 1000;
}

function guestSession(): Session {
  return {
    token: GUEST_TOKEN,
    profile: { displayName: 'Guest', email: 'dev@octopus.local' },
    userEntityRef: 'user:default/guest',
  };
}

function sessionFromToken(token: string): Session {
  // Derive the profile from the id token's claims for display purposes. This is
  // not a trust boundary — the backend still verifies the token on each request.
  const claims = decodeJwtClaims(token) ?? {};
  const sub = typeof claims.sub === 'string' ? claims.sub : 'user';
  const email = typeof claims.email === 'string' ? claims.email : undefined;
  const displayName =
    str(claims.name) ??
    str(claims.preferred_username) ??
    email ??
    str(claims.sub) ??
    'Signed-in user';

  return {
    token,
    profile: { displayName, email },
    userEntityRef: `user:default/${sub}`,
  };
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

/** Best-effort decode of a JWT payload's claims; undefined if not a JWT. */
function decodeJwtClaims(token: string): Record<string, unknown> | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return undefined;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '==='.slice((base64.length + 3) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const claims = JSON.parse(json);
    return claims && typeof claims === 'object' ? claims : undefined;
  } catch {
    return undefined;
  }
}
