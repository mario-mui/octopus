import { ReactNode } from 'react';
import { createApiRef } from '../system';
import { Observable } from '@octopus/types';

/**
 * Describes a theme provided by the app.
 *
 * @public
 */
export type AppTheme = {
  /**
   * ID used to remember theme selections.
   */
  id: string;

  /**
   * Title of the theme
   */
  title: string;

  /**
   * Theme variant
   */
  variant: 'light' | 'dark';

  /**
   * An Icon for the theme mode setting.
   */
  icon?: React.ReactElement;

  Provider(props: { children: ReactNode }): JSX.Element | null;
};

/**
 * The AppThemeApi gives access to the current app theme, and allows switching
 * to other options that have been registered as a part of the App.
 *
 * @public
 */
export type AppThemeApi = {
  /**
   * Get a list of available themes.
   */
  getInstalledThemes(): AppTheme[];

  /**
   * Observe the currently selected theme. A value of undefined means no specific theme has been selected.
   */
  activeThemeId$(): Observable<string | undefined>;

  /**
   * Get the current theme ID. Returns undefined if no specific theme is selected.
   */
  getActiveThemeId(): string | undefined;

  /**
   * Set a specific theme to use in the app, overriding the default theme selection.
   *
   * Clear the selection by passing in undefined.
   */
  setActiveThemeId(themeId?: string): void;
};

/**
 * The {@link ApiRef} of {@link AppThemeApi}.
 *
 * @public
 */
export const appThemeApiRef = createApiRef<AppThemeApi>().with({
  id: 'core.apptheme',
  pluginId: 'app',
});
