/*
 * Header actions for the app shell header. A help icon, a divider, then the
 * account menu — which carries the (real, API-driven) theme and language
 * switches as hover submenus, plus a sign-out action. The active theme/language
 * are highlighted via `selectedKeys` (no checkmarks), matching the design. This
 * container builds the items and handles selections, keeping the API
 * dependencies out of the shell.
 */
import { useEffect, useState } from 'react';
import { Divider, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  BgColorsOutlined,
  GlobalOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {
  useApi,
  appLanguageApiRef,
  appThemeApiRef,
  identityApiRef,
} from '@octopus/core-plugin-api';
import { AccountMenu } from './AccountMenu';

const LANG_PREFIX = 'lang:';
const THEME_PREFIX = 'theme:';
const THEME_SYSTEM = 'system';

export function HeaderActions() {
  const languageApi = useApi(appLanguageApiRef);
  const themeApi = useApi(appThemeApiRef);
  const identityApi = useApi(identityApiRef);
  const {
    token: { colorTextSecondary, colorSplit },
  } = theme.useToken();

  const [language, setLanguage] = useState(languageApi.getLanguage().language);
  const [themeId, setThemeId] = useState(themeApi.getActiveThemeId());
  const [userName, setUserName] = useState('Guest');

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

  useEffect(() => {
    let active = true;
    identityApi.getProfileInfo().then(profile => {
      // Show the user's email (the design's `admin@cpaas.io`), else the name.
      const label = profile.email ?? profile.displayName;
      if (active && label) {
        setUserName(label);
      }
    });
    return () => {
      active = false;
    };
  }, [identityApi]);

  const { languages } = languageApi.getAvailableLanguages();
  const themes = themeApi.getInstalledThemes();

  const items: MenuProps['items'] = [
    {
      key: 'theme',
      icon: <BgColorsOutlined />,
      label: 'Theme',
      children: [
        { key: `${THEME_PREFIX}${THEME_SYSTEM}`, label: 'Follow the System' },
        ...themes.map(t => ({ key: `${THEME_PREFIX}${t.id}`, label: t.title })),
      ],
    },
  ];

  if (languages.length > 1) {
    items.push({
      key: 'language',
      icon: <GlobalOutlined />,
      label: 'Language',
      children: languages.map(l => ({
        key: `${LANG_PREFIX}${l}`,
        label: l.toUpperCase(),
      })),
    });
  }

  items.push(
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Log Out' },
  );

  // Highlight the active theme and language in their submenus.
  const selectedKeys = [
    `${THEME_PREFIX}${themeId ?? THEME_SYSTEM}`,
    `${LANG_PREFIX}${language}`,
  ];

  const handleSelect = (key: string) => {
    if (key.startsWith(LANG_PREFIX)) {
      languageApi.setLanguage(key.slice(LANG_PREFIX.length));
    } else if (key.startsWith(THEME_PREFIX)) {
      const id = key.slice(THEME_PREFIX.length);
      themeApi.setActiveThemeId(id === THEME_SYSTEM ? undefined : id);
    } else if (key === 'logout') {
      void identityApi.signOut();
    }
  };

  return (
    <>
      <QuestionCircleOutlined
        style={{ fontSize: 18, color: colorTextSecondary, cursor: 'pointer' }}
      />
      <Divider type="vertical" style={{ height: 20, borderColor: colorSplit }} />
      <AccountMenu
        userName={userName}
        items={items}
        selectedKeys={selectedKeys}
        onSelect={handleSelect}
      />
    </>
  );
}
