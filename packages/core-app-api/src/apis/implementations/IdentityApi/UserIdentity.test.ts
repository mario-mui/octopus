// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserIdentity } from './UserIdentity';

const STORAGE_KEY = 'id_token';

/** Stub global fetch with a map of url-substring → { status, body }. */
function stubFetch(routes: Record<string, { status: number; body?: unknown }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const match = Object.keys(routes).find(key => url.includes(key));
      const route = match ? routes[match] : { status: 404 };
      return Promise.resolve({
        ok: route.status >= 200 && route.status < 300,
        status: route.status,
        json: () => Promise.resolve(route.body ?? {}),
      } as Response);
    }),
  );
}

describe('UserIdentity.resolve', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('auto-logs in a guest in dev when there is no token', async () => {
    const identity = UserIdentity.resolve({
      devAutoLogin: true,
      loginUrl: '/login',
    });

    expect(identity.isSignedIn()).toBe(true);
    expect((await identity.getProfileInfo()).displayName).toBe('Guest');
    // The guest session is persisted so a reload stays signed in.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy();
  });

  it('stays signed out without auto-login when there is no token', async () => {
    const identity = UserIdentity.resolve({
      devAutoLogin: false,
      loginUrl: '/login',
    });

    expect(identity.isSignedIn()).toBe(false);
    await expect(identity.getUserIdentity()).rejects.toThrow();
    expect(await identity.getCredentials()).toEqual({ token: undefined });
    // No guest token is written when auto-login is off.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('treats an existing token as signed in regardless of auto-login', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'existing-token');

    const identity = UserIdentity.resolve({
      devAutoLogin: false,
      loginUrl: '/login',
    });

    expect(identity.isSignedIn()).toBe(true);
    expect(await identity.getCredentials()).toEqual({ token: 'existing-token' });
  });

  it('reads the display name from a JWT id token', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      jwt({ name: 'Ada Lovelace', email: 'ada@example.com', sub: 'ada' }),
    );

    const identity = UserIdentity.resolve({
      devAutoLogin: false,
      loginUrl: '/login',
    });

    const profile = await identity.getProfileInfo();
    expect(profile.displayName).toBe('Ada Lovelace');
    expect(profile.email).toBe('ada@example.com');
    expect((await identity.getUserIdentity()).userEntityRef).toBe(
      'user:default/ada',
    );
  });

  it('keeps the guest name across reloads (persisted guest token)', async () => {
    // First load wrote the guest token; a reload must not degrade to a generic
    // "signed-in user" name.
    UserIdentity.resolve({ devAutoLogin: true, loginUrl: '/login' });
    const reloaded = UserIdentity.resolve({
      devAutoLogin: true,
      loginUrl: '/login',
    });

    expect((await reloaded.getProfileInfo()).displayName).toBe('Guest');
  });
});

describe('UserIdentity backend mode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the real signed-in user from the backend', async () => {
    stubFetch({
      '/token/info': {
        status: 200,
        body: { name: 'Grace Hopper', email: 'grace@navy.mil', sub: 'grace' },
      },
    });

    const identity = UserIdentity.resolve({
      devAutoLogin: false,
      loginUrl: '/login',
      userInfoUrl: '/console/api/v2/token/info',
      signInInfoUrl: '/console/api/v2/token/login',
    });

    // Unknown until loaded, so the gate shows a spinner first.
    expect(identity.isSignedIn()).toBeUndefined();
    expect(await identity.ensureLoaded()).toBe(true);
    expect(identity.isSignedIn()).toBe(true);
    expect((await identity.getProfileInfo()).displayName).toBe('Grace Hopper');
    expect((await identity.getUserIdentity()).userEntityRef).toBe(
      'user:default/grace',
    );
  });

  it('falls back to the backend auth_url when not signed in', async () => {
    stubFetch({
      '/token/info': { status: 401 },
      '/token/login': {
        status: 200,
        body: { auth_url: 'http://localhost:3000/dex/auth?redirect_uri=/' },
      },
    });

    const identity = UserIdentity.resolve({
      devAutoLogin: false,
      loginUrl: '/login',
      userInfoUrl: '/console/api/v2/token/info',
      signInInfoUrl: '/console/api/v2/token/login',
    });

    expect(await identity.ensureLoaded()).toBe(false);
    expect(identity.isSignedIn()).toBe(false);
    expect(identity.getSignInUrl()).toBe(
      'http://localhost:3000/dex/auth?redirect_uri=/',
    );
  });
});

/** Build a JWT with the given payload claims (signature is irrelevant here). */
function jwt(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(claims)}.sig`;
}
