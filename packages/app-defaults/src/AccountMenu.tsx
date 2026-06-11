import { ReactNode } from 'react';
import { Avatar, Dropdown, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  DownOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';

export interface AccountMenuProps {
  /** Display name shown next to the avatar. */
  userName?: string;
  /** Avatar node; defaults to a generic user glyph. */
  avatar?: ReactNode;
  /** Dropdown entries; defaults to profile / settings / sign out. */
  items?: MenuProps['items'];
  /** Invoked with the clicked entry's key. */
  onSelect?: (key: string) => void;
}

const DEFAULT_ITEMS: MenuProps['items'] = [
  { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
  { type: 'divider' },
  { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out' },
];

/**
 * Presentational account menu for the app header: an avatar + name that opens a
 * dropdown of account actions. Stateless — the caller supplies the user and
 * handles selections, so it stays free of any auth/utility-API dependency.
 */
export function AccountMenu({
  userName = 'Guest',
  avatar = <Avatar size="small" icon={<UserOutlined />} />,
  items = DEFAULT_ITEMS,
  onSelect,
}: AccountMenuProps) {
  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => onSelect?.(key),
        triggerSubMenuAction: 'click',
      }}
      trigger={['click']}
    >
      <Space style={{ cursor: 'pointer', padding: '0 8px' }}>
        {avatar}
        <Typography.Text>{userName}</Typography.Text>
        <DownOutlined style={{ fontSize: 10 }} />
      </Space>
    </Dropdown>
  );
}
