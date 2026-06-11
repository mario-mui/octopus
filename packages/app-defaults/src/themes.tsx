/*
 * The app's installed themes. Each carries an Ant Design `ConfigProvider` as
 * its Provider, applying the matching light/dark algorithm. "System" is not a
 * theme here — it is the absence of an explicit selection, resolved against the
 * OS preference by {@link AppThemeProvider}.
 */
import { ConfigProvider, theme as antdTheme } from 'antd';
import type { AppTheme } from '@octopus/core-plugin-api';

const { defaultAlgorithm, darkAlgorithm } = antdTheme;

export const themes: AppTheme[] = [
  {
    id: 'light',
    title: 'Light',
    variant: 'light',
    Provider: ({ children }) => (
      <ConfigProvider theme={{ algorithm: defaultAlgorithm }}>
        {children}
      </ConfigProvider>
    ),
  },
  {
    id: 'dark',
    title: 'Dark',
    variant: 'dark',
    Provider: ({ children }) => (
      <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
        {children}
      </ConfigProvider>
    ),
  },
];
