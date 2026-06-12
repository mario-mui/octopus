import { ReactNode } from 'react';
import { Avatar, ConfigProvider, Dropdown, theme } from 'antd';
import type { MenuProps } from 'antd';
import { createStyles } from 'antd-style';
import {
  DownOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';

const PORTRAIT =
  'https://devops-daily-eleqy7--idp.alaudatech.net/console-acp-new/assets/images/portrait.svg';

const useStyles = createStyles(({ token, css }) => ({
  // The account pill: avatar + name + caret. Neutral by default; the blue fill
  // appears only on hover (and while the dropdown is open).
  trigger: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 4px 14px 4px 4px;
    border-radius: 20px;
    color: ${token.colorText};
    cursor: pointer;
    user-select: none;
    transition: background 0.2s, color 0.2s;

    &:hover,
    &.ant-dropdown-open {
      background: ${token.colorPrimary};
      color: #fff;
    }
  `,
  avatar: css`
    flex: 0 0 auto;
    border: 2px solid ${token.colorBgContainer};
  `,
  name: css`
    font-weight: 500;
    white-space: nowrap;
    color: inherit;
  `,
  caret: css`
    font-size: 12px;
    opacity: 0.9;
    color: inherit;
  `,
  // Top-level items (Theme / Language / Log Out) turn blue only on hover. antd
  // tints a submenu title blue when it contains the selected leaf — undo that so
  // the parents stay neutral until hovered. Scoped to the dropdown popup root
  // and forced with !important to beat antd's selected-state rule. The selected
  // leaf (in its own flyout popup) keeps its highlight.
  dropdown: css`
    .ant-dropdown-menu-submenu-selected > .ant-dropdown-menu-submenu-title {
      color: ${token.colorText} !important;
      background: transparent !important;
    }
    .ant-dropdown-menu-submenu-selected
      > .ant-dropdown-menu-submenu-title:hover {
      color: ${token.colorPrimary} !important;
      background: ${token.colorPrimaryBg} !important;
    }
  `,
}));

export interface AccountMenuProps {
  /** Display name shown next to the avatar. */
  userName?: string;
  /** Avatar node; defaults to the portrait glyph. */
  avatar?: ReactNode;
  /** Dropdown entries; defaults to profile / settings / sign out. */
  items?: MenuProps['items'];
  /** Keys of the active entries (e.g. current theme / language) to highlight. */
  selectedKeys?: string[];
  /** Invoked with the clicked entry's key. */
  onSelect?: (key: string) => void;
}

const DEFAULT_ITEMS: MenuProps['items'] = [
  { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
  { type: 'divider' },
  { key: 'logout', icon: <LogoutOutlined />, label: 'Log Out' },
];

/**
 * Account menu for the app header: a blue pill (avatar + name) opening a
 * dropdown of account actions. Submenus open on hover, and the active entries
 * (theme / language) are highlighted with the primary colour, per the design.
 * Stateless — the caller supplies the user, the selection and the handler.
 */
export function AccountMenu({
  userName = 'Guest',
  avatar,
  items = DEFAULT_ITEMS,
  selectedKeys,
  onSelect,
}: AccountMenuProps) {
  const { styles } = useStyles();
  const { token } = theme.useToken();

  const avatarNode = avatar ?? (
    <Avatar
      size={32}
      src={PORTRAIT}
      icon={<UserOutlined />}
      className={styles.avatar}
    />
  );

  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            // Blue text + light-blue background for the active/hovered item.
            itemSelectedColor: token.colorPrimary,
            itemSelectedBg: token.colorPrimaryBg,
            itemHoverColor: token.colorPrimary,
            itemHoverBg: token.colorPrimaryBg,
          },
        },
      }}
    >
      <Dropdown
        trigger={['click']}
        rootClassName={styles.dropdown}
        menu={{
          items,
          selectable: true,
          selectedKeys,
          // Theme/Language flyouts open on hover, not click.
          triggerSubMenuAction: 'hover',
          onClick: ({ key }) => onSelect?.(key),
        }}
      >
        <div className={styles.trigger}>
          {avatarNode}
          <span className={styles.name}>{userName}</span>
          <DownOutlined className={styles.caret} />
        </div>
      </Dropdown>
    </ConfigProvider>
  );
}
