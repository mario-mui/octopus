import { loader } from '@monaco-editor/react';

import type { Monaco } from './types';

/**
 * Theme ids registered on monaco. The active one is selected by the consuming
 * component based on Ant Design's current appearance (see {@link useMonacoTheme}).
 */
export const MONACO_LIGHT_THEME = 'octopus-light';
export const MONACO_DARK_THEME = 'octopus-dark';

let themesDefined = false;

/**
 * Register the light/dark editor themes. Ported from the Angular
 * `AlaudaMonacoProviderService.defineThemes`, but with no localStorage / system
 * mode — the active theme follows the Ant Design theme instead.
 */
export function defineThemes(m: Monaco) {
  if (themesDefined) {
    return;
  }
  themesDefined = true;

  m.editor.defineTheme(MONACO_LIGHT_THEME, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editorCursor.foreground': '#526FFF',
    },
  });

  m.editor.defineTheme(MONACO_DARK_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c636f', fontStyle: 'italic' },
      { token: 'type', foreground: 'DE6D77' },
      { token: 'string', foreground: '99C27C' },
    ],
    colors: {
      'editor.foreground': '#ffffff',
      'editor.background': '#242733',
    },
  });
}

let initPromise: Promise<Monaco> | undefined;

/**
 * Resolve the monaco instance (already provided to `@monaco-editor/react`'s
 * shared loader by the host's `setupMonaco`), registering the editor themes once
 * ready. Returns a promise that resolves when monaco is loaded and themed.
 */
export function initMonaco(): Promise<Monaco> {
  if (!initPromise) {
    initPromise = loader.init().then(m => {
      defineThemes(m);
      return m;
    });
  }
  return initPromise;
}

/**
 * Let monaco return language information (extensions / mimetypes) for the given
 * alias or id. Ported from `MonacoProviderService.getLanguageExtensionPoint`.
 */
export function getLanguageExtensionPoint(m: Monaco, alias: string) {
  return m.languages
    .getLanguages()
    .find(({ aliases, id }) => aliases?.includes(alias) || id === alias);
}
