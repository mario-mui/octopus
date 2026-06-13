import { useTheme } from 'antd-style';

import { MONACO_DARK_THEME, MONACO_LIGHT_THEME } from './loader';

/**
 * Resolve the monaco theme id from Ant Design's current appearance.
 *
 * `antd-style`'s theme is derived from the active AntD `ConfigProvider`
 * algorithm (default vs. dark), so the editor follows the app's theme switch
 * automatically — there is no editor-local theme toggle or localStorage, unlike
 * the original Angular library.
 */
export function useMonacoTheme(): string {
  const { appearance } = useTheme();
  return appearance === 'dark' ? MONACO_DARK_THEME : MONACO_LIGHT_THEME;
}
