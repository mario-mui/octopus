// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserIdentity } from './UserIdentity';

const STORAGE_KEY = 'id_token';

/** Stub the global fetch used by token/info validation. */
function stubTokenInfo(result: number | 'network-error') {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      result === 'network-error'
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve({
            ok: result >= 200 && result < 300,
            status: result,
            json: () => Promise.resolve({}),
          } as Response),
    ),
  );
}

const backendOptions = {
  devAutoLogin: false,
  loginUrl: '/login',
  userInfoUrl: '/console/api/v2/token/info',
  signInUrl: 'http://localhost:8082/dex/auth',
};

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
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const validToken = () =>
    jwt({
      name: 'Grace Hopper',
      email: 'grace@navy.mil',
      sub: 'grace',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

  it('validates the id token (token/info ok) and signs in', async () => {
    window.localStorage.setItem(STORAGE_KEY, validToken());
    stubTokenInfo(200);

    const identity = UserIdentity.resolve(backendOptions);

    // Unknown until loaded, so the gate shows a spinner first.
    expect(identity.isSignedIn()).toBeUndefined();
    expect(await identity.ensureLoaded()).toBe(true);
    expect(identity.isSignedIn()).toBe(true);
    expect((await identity.getProfileInfo()).displayName).toBe('Grace Hopper');
    expect((await identity.getUserIdentity()).userEntityRef).toBe(
      'user:default/grace',
    );
  });

  it('clears a revoked id token (token/info 401) and signs out', async () => {
    window.localStorage.setItem(STORAGE_KEY, validToken());
    stubTokenInfo(401);

    const identity = UserIdentity.resolve(backendOptions);

    expect(await identity.ensureLoaded()).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('trusts the id token when token/info has a network error', async () => {
    window.localStorage.setItem(STORAGE_KEY, validToken());
    stubTokenInfo('network-error');

    const identity = UserIdentity.resolve(backendOptions);

    expect(await identity.ensureLoaded()).toBe(true);
    expect((await identity.getProfileInfo()).displayName).toBe('Grace Hopper');
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('redirects straight to the dex sign-in URL when there is no id token', async () => {
    const identity = UserIdentity.resolve(backendOptions);

    expect(await identity.ensureLoaded()).toBe(false);
    expect(identity.isSignedIn()).toBe(false);
    expect(identity.getSignInUrl()).toBe(
      `http://localhost:8082/dex/auth?redirect_uri=${window.location.origin}/`,
    );
  });

  it('drops an expired id token without calling the backend', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      jwt({ name: 'Old', sub: 'old', exp: Math.floor(Date.now() / 1000) - 10 }),
    );

    const identity = UserIdentity.resolve(backendOptions);

    expect(await identity.ensureLoaded()).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

/** Build a JWT with the given payload claims (signature is irrelevant here). */
function jwt(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(claims)}.sig`;
}
