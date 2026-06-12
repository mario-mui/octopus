/*
 * Auth gate. If the current user is signed in, renders the app; otherwise it
 * redirects to the sign-in URL.
 *
 * - Mock mode resolves synchronously (dev auto-login means already signed in,
 *   so there is no flash and the redirect never fires).
 * - Backend mode resolves asynchronously: it shows a spinner while the current
 *   user is fetched, then either renders the app or redirects into the real
 *   sign-in flow (`auth_url` from the backend).
 *
 * A one-shot guard (sessionStorage) prevents an infinite sign-in loop when the
 * redirect comes back still unauthenticated.
 */
import { PropsWithChildren, useEffect, useState } from 'react';
import { Button, Result } from 'antd';
import {
  useApi,
  identityApiRef,
  configApiRef,
  type IdentityApi,
} from '@octopus/core-plugin-api';
import { AppLoading } from '@octopus/core-components';

const COUNT_KEY = 'octopus.signin.count';
const TIME_KEY = 'octopus.signin.since';
const MAX_REDIRECTS = 3;
const WINDOW_MS = 30_000;

type GatedIdentity = IdentityApi &
  Partial<{
    isSignedIn(): boolean | undefined;
    ensureLoaded(): Promise<boolean>;
    getSignInUrl(): string;
  }>;

export function RequireAuth({ children }: PropsWithChildren) {
  const identityApi = useApi(identityApiRef) as GatedIdentity;
  const config = useApi(configApiRef);
  const fallbackLoginUrl = config.getOptionalString('auth.loginUrl') ?? '/login';

  // Known synchronously in mock mode; `undefined` in backend mode until loaded.
  // A custom identity without `isSignedIn` is assumed signed in.
  const known =
    typeof identityApi.isSignedIn === 'function'
      ? identityApi.isSignedIn()
      : true;
  const [signedIn, setSignedIn] = useState<boolean | undefined>(known);
  const [loopBlocked, setLoopBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    if (signedIn === undefined && identityApi.ensureLoaded) {
      identityApi.ensureLoaded().then(value => {
        if (active) {
          setSignedIn(value);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [identityApi, signedIn]);

  useEffect(() => {
    if (signedIn === true) {
      sessionStorage.removeItem(COUNT_KEY);
      sessionStorage.removeItem(TIME_KEY);
      return;
    }
    if (signedIn === false) {
      // The sign-in flow can take a couple of hops (token/login → dex → back),
      // so allow a few redirects within a window before giving up — this avoids
      // both an infinite loop and falsely blocking a legitimate multi-hop login.
      const now = Date.now();
      const since = Number(sessionStorage.getItem(TIME_KEY) ?? 0);
      let count = Number(sessionStorage.getItem(COUNT_KEY) ?? 0);
      if (!since || now - since > WINDOW_MS) {
        count = 0;
        sessionStorage.setItem(TIME_KEY, String(now));
      }
      if (count >= MAX_REDIRECTS) {
        setLoopBlocked(true);
        return;
      }
      sessionStorage.setItem(COUNT_KEY, String(count + 1));
      window.location.href = identityApi.getSignInUrl?.() ?? fallbackLoginUrl;
    }
  }, [signedIn, identityApi, fallbackLoginUrl]);

  if (loopBlocked) {
    const signInUrl = identityApi.getSignInUrl?.() ?? fallbackLoginUrl;
    return (
      <Result
        status="warning"
        title="Sign-in did not complete"
        subTitle={`The backend redirected back without an authenticated session. Check the dev-console terminal logs. Sign-in URL: ${signInUrl}`}
        extra={
          <Button
            type="primary"
            onClick={() => {
              sessionStorage.removeItem(COUNT_KEY);
              sessionStorage.removeItem(TIME_KEY);
              window.location.assign(signInUrl);
            }}
          >
            Retry sign-in
          </Button>
        }
      />
    );
  }
  // Same spinner as the HTML initial load, so the hand-off is seamless.
  if (signedIn === undefined || signedIn === false) {
    return <AppLoading />;
  }
  return <>{children}</>;
}
