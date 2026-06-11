/*
 * Header actions for the app shell header. The account menu is the single
 * entry point: it carries the (real, API-driven) language and theme switches
 * as submenus, alongside placeholder account actions. The presentational
 * AccountMenu supplies the chrome; this container builds its items and handles
 * selections, keeping the API dependencies out of the shell.
 */
import { useEffect, useState } from 'react';
import type { MenuProps } from 'antd';
import {
  BgColorsOutlined,
  CheckOutlined,
  GlobalOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  useApi,
  appLanguageApiRef,
  appThemeApiRef,
} from '@octopus/core-plugin-api';
import { AccountMenu } from './AccountMenu';

const LANG_PREFIX = 'lang:';
const THEME_PREFIX = 'theme:';
const THEME_SYSTEM = 'system';

/** Tick the active entry, mirroring the reference console's checkmark. */
const check = (active: boolean) =>
  active ? <CheckOutlined /> : undefined;

export function HeaderActions() {
  const languageApi = useApi(appLanguageApiRef);
  const themeApi = useApi(appThemeApiRef);

  const [language, setLanguage] = useState(languageApi.getLanguage().language);
  const [themeId, setThemeId] = useState(themeApi.getActiveThemeId());

  useEffect(() => {
    const sub = languageApi
      .language$()
      .subscribe(next => setLanguage(next.language));
    return () => sub.unsubscribe();
  }, [languageApi]);

  useEffect(() => {
    const sub = themeApi.activeThemeId$().subscribe(setThemeId);
    return () => sub.unsubscribe();
  }, [themeApi]);

  const { languages } = languageApi.getAvailableLanguages();
  const themes = themeApi.getInstalledThemes();

  const items: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
  ];

  if (languages.length > 1) {
    items.push({
      key: 'language',
      icon: <GlobalOutlined />,
      label: 'Language',
      children: languages.map(l => ({
        key: `${LANG_PREFIX}${l}`,
        label: l.toUpperCase(),
        icon: check(l === language),
      })),
    });
  }

  items.push({
    key: 'theme',
    icon: <BgColorsOutlined />,
    label: 'Theme',
    children: [
      {
        key: `${THEME_PREFIX}${THEME_SYSTEM}`,
        label: 'System',
        icon: check(themeId === undefined),
      },
      ...themes.map(t => ({
        key: `${THEME_PREFIX}${t.id}`,
        label: t.title,
        icon: check(t.id === themeId),
      })),
    ],
  });

  items.push({ type: 'divider' }, {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Sign out',
  });

  const handleSelect = (key: string) => {
    if (key.startsWith(LANG_PREFIX)) {
      languageApi.setLanguage(key.slice(LANG_PREFIX.length));
    } else if (key.startsWith(THEME_PREFIX)) {
      const id = key.slice(THEME_PREFIX.length);
      themeApi.setActiveThemeId(id === THEME_SYSTEM ? undefined : id);
    }
    // profile / logout are placeholders until auth is wired up.
  };

  return <AccountMenu items={items} onSelect={handleSelect} />;
}
