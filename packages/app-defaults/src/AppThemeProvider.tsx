/*
 * Subscribes to the active theme id from `appThemeApi` and renders the matching
 * theme's Provider around the app. When no theme is explicitly selected it
 * follows the OS `prefers-color-scheme`. Ported from Backstage's
 * core-app-api AppThemeProvider (Apache-2.0).
 */
import {
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useApi, appThemeApiRef, AppTheme } from '@octopus/core-plugin-api';

/** Resolve the theme to render: explicit selection, else OS preference, else light. */
function resolveTheme(
  themeId: string | undefined,
  shouldPreferDark: boolean,
  themes: AppTheme[],
): AppTheme | undefined {
  if (themeId !== undefined) {
    const selected = themes.find(theme => theme.id === themeId);
    if (selected) {
      return selected;
    }
  }
  if (shouldPreferDark) {
    const dark = themes.find(theme => theme.variant === 'dark');
    if (dark) {
      return dark;
    }
  }
  return themes.find(theme => theme.variant === 'light') ?? themes[0];
}

/**
 * Track the OS `prefers-color-scheme: dark` media query. Safely degrades to
 * `false` in environments without `matchMedia` (e.g. jsdom).
 */
function useShouldPreferDarkTheme(): boolean {
  const mediaQuery = useMemo(
    () =>
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null,
    [],
  );
  const [shouldPreferDark, setShouldPreferDark] = useState(
    mediaQuery?.matches ?? false,
  );

  useEffect(() => {
    if (!mediaQuery) {
      return undefined;
    }
    const listener = (event: MediaQueryListEvent) =>
      setShouldPreferDark(event.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [mediaQuery]);

  return shouldPreferDark;
}

/** Subscribe to an observable, seeding with its current value. */
function useActiveThemeId(): string | undefined {
  const appThemeApi = useApi(appThemeApiRef);
  const [themeId, setThemeId] = useState(appThemeApi.getActiveThemeId());

  useEffect(() => {
    const sub = appThemeApi.activeThemeId$().subscribe(setThemeId);
    return () => sub.unsubscribe();
  }, [appThemeApi]);

  return themeId;
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const appThemeApi = useApi(appThemeApiRef);
  const themeId = useActiveThemeId();
  const shouldPreferDark = useShouldPreferDarkTheme();

  const appTheme = resolveTheme(
    themeId,
    shouldPreferDark,
    appThemeApi.getInstalledThemes(),
  );
  if (!appTheme) {
    throw new Error('App has no themes');
  }

  return <appTheme.Provider>{children}</appTheme.Provider>;
}
