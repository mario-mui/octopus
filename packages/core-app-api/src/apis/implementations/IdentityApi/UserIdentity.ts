import {
  IdentityApi,
  ProfileInfo,
  UserIdentityInfo,
} from '@octopus/core-plugin-api';

const STORAGE_KEY = 'id_token';
const GUEST_TOKEN = 'octopus-dev-guest';

/** @public */
export interface ResolveIdentityOptions {
  /** When true and no session exists, sign in a local guest user (dev mode). */
  devAutoLogin: boolean;
  /** Fallback sign-in URL; also where signOut sends the user. */
  loginUrl: string;
  /**
   * Backend "current user" endpoint (e.g. `/console/api/v2/token/info`). When
   * set, the identity is resolved from the backend session (cookie-based) rather
   * than a local token — this is what shows the real signed-in user.
   */
  userInfoUrl?: string;
  /**
   * Backend token-login endpoint (e.g. `/console/api/v2/token/login`) that
   * returns `{ auth_url }`. Used to redirect anonymous users into the real
   * sign-in flow. Defaults to {@link ResolveIdentityOptions.loginUrl}.
   */
  signInInfoUrl?: string;
}

interface Session {
  token?: string;
  profile: ProfileInfo;
  userEntityRef: string;
}

/**
 * The current-user shape returned by the backend token-info endpoint. Only the
 * display-relevant claims are read; the structure is otherwise tolerated.
 */
interface AccountInfo {
  name?: string;
  email?: string;
  sub?: string;
  preferred_username?: string;
  displayName?: string;
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
        userInfoUrl: options.userInfoUrl,
        signInInfoUrl: options.signInInfoUrl,
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
  readonly #userInfoUrl?: string;
  readonly #signInInfoUrl?: string;
  #session: Session | undefined;
  #loaded: boolean;
  #signInUrl: string | undefined;

  private constructor(opts: {
    mode: 'mock' | 'backend';
    loginUrl: string;
    session?: Session;
    userInfoUrl?: string;
    signInInfoUrl?: string;
  }) {
    this.#mode = opts.mode;
    this.#loginUrl = opts.loginUrl;
    this.#userInfoUrl = opts.userInfoUrl;
    this.#signInInfoUrl = opts.signInInfoUrl;
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

  /** Resolve the backend session once; resolves to whether the user is signed in. */
  async ensureLoaded(): Promise<boolean> {
    if (this.#loaded) {
      return this.#session !== undefined;
    }
    this.#loaded = true;
    const hasToken =
      typeof window !== 'undefined' &&
      Boolean(window.localStorage.getItem('id_token'));
    try {
      const res = await fetch(this.#userInfoUrl!, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      authTrail('token/info', { status: res.status, hasIdToken: hasToken });
      if (res.ok) {
        this.#session = sessionFromAccountInfo((await res.json()) as AccountInfo);
        return true;
      }
    } catch (err) {
      authTrail('token/info error', { error: String(err) });
    }
    // Not signed in: capture the backend sign-in URL for the redirect.
    this.#signInUrl = await this.#resolveSignInUrl();
    authTrail('not signed in; redirecting', { to: this.#signInUrl });
    return false;
  }

  /** Where the auth gate should send an anonymous user. */
  getSignInUrl(): string {
    return this.#signInUrl ?? this.#loginUrl;
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

  /** Fetch the backend `auth_url` to redirect into the real sign-in flow. */
  async #resolveSignInUrl(): Promise<string> {
    if (!this.#signInInfoUrl) {
      return this.#loginUrl;
    }
    try {
      const res = await fetch(this.#signInInfoUrl, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (res.ok) {
        const { auth_url: authUrl } = (await res.json()) as { auth_url?: string };
        if (typeof authUrl === 'string' && authUrl) {
          return authUrl;
        }
      }
    } catch {
      // fall back to the configured login URL
    }
    return this.#loginUrl;
  }
}

/** Append to the shared localStorage diagnostic trail (survives redirects). */
function authTrail(msg: string, data?: unknown): void {
  console.info('[identity]', msg, data ?? '');
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const trail = JSON.parse(
      window.localStorage.getItem('octopus.authlog') ?? '[]',
    ) as unknown[];
    trail.push({ t: new Date().toISOString(), msg, data });
    window.localStorage.setItem('octopus.authlog', JSON.stringify(trail.slice(-40)));
  } catch {
    // ignore storage errors
  }
}

function sessionFromAccountInfo(info: AccountInfo): Session {
  const displayName =
    str(info.name) ??
    str(info.displayName) ??
    str(info.preferred_username) ??
    str(info.email) ??
    str(info.sub) ??
    'User';
  const sub = str(info.sub) ?? str(info.email) ?? 'user';
  return {
    profile: { displayName, email: info.email },
    userEntityRef: `user:default/${sub}`,
  };
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
