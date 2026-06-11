import './global.css';
import { ReactNode, useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const HEADER_HEIGHT = 60;
const SIDER_WIDTH = 220;
const SIDER_COLLAPSED_WIDTH = 48;

/** A navigation entry rendered in the sidebar menu. Supports nesting. */
export interface NavItem {
  /** Target path; also used as the menu selection key. */
  to: string;
  title: string;
  icon?: ReactNode;
  /** Child entries rendered as a (possibly hover-flyout) submenu. */
  children?: NavItem[];
}

/** A routable page rendered in the content area. */
export interface AppRoute {
  path: string;
  element: ReactNode;
}

export interface AppLayoutProps {
  title?: string;
  nav: NavItem[];
  routes: AppRoute[];
  /** Content rendered on the right side of the header (e.g. account menu). */
  headerActions?: ReactNode;
}

/** Build Ant Design `Menu` items from the nav tree, recursing into children. */
function toMenuItems(items: NavItem[]): NonNullable<
  React.ComponentProps<typeof Menu>['items']
> {
  return items.map(item =>
    item.children?.length
      ? {
          key: item.to,
          icon: item.icon,
          label: item.title,
          children: toMenuItems(item.children),
        }
      : {
          key: item.to,
          icon: item.icon,
          label: <Link to={item.to}>{item.title}</Link>,
        },
  );
}

function AppLayoutInner({
  title = 'Octopus',
  nav,
  routes,
  headerActions,
}: AppLayoutProps) {
  const location = useLocation();
  const firstPath = routes[0]?.path;
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, colorBorderSecondary, colorPrimary, colorText },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Full-width header across the top: logo on the left, actions on the right. */}
      <Header
        style={{
          height: HEADER_HEIGHT,
          lineHeight: `${HEADER_HEIGHT}px`,
          background: colorBgContainer,
          borderBlockEnd: `1px solid ${colorBorderSecondary}`,
          paddingInline: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          position: 'sticky',
          insetBlockStart: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 600,
            fontSize: 18,
            color: colorPrimary,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 22 }}>🐙</span>
          <span style={{ marginInlineStart: 8 }}>{title}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {headerActions}
        </div>
      </Header>

      {/* Below the header: sidebar nav on the left, content on the right. */}
      <Layout hasSider>
        {/* No fixed `theme` prop: the sidebar follows the active light/dark
            algorithm via tokens, so it darkens with the rest of the app. */}
        <Sider
          width={SIDER_WIDTH}
          collapsedWidth={SIDER_COLLAPSED_WIDTH}
          collapsed={collapsed}
          breakpoint="lg"
          onBreakpoint={broken => setCollapsed(broken)}
          style={{
            background: colorBgContainer,
            borderInlineEnd: `1px solid ${colorBorderSecondary}`,
            height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            position: 'sticky',
            insetBlockStart: HEADER_HEIGHT,
          }}
        >
          {/* Own flex column (Sider's style can't reach the children
              wrapper), so the toggle below is pushed to the bottom. */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={toMenuItems(nav)}
              style={{
                background: 'transparent',
                borderInlineEnd: 0,
                flex: 1,
                overflowY: 'auto',
              }}
            />

            {/* Collapse toggle pinned to the bottom-right corner of the rail. */}
            <div
              style={{
                borderBlockStart: `1px solid ${colorBorderSecondary}`,
                padding: 8,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <div
                role="button"
                aria-label={collapsed ? 'expand sidebar' : 'collapse sidebar'}
                aria-expanded={!collapsed}
                tabIndex={0}
                onClick={() => setCollapsed(c => !c)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCollapsed(c => !c);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  fontSize: 16,
                  // Follows the theme, so it stays light on a dark sidebar.
                  color: colorText,
                }}
              >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </div>
            </div>
          </div>
        </Sider>

        <Content style={{ margin: 24 }}>
          <Routes>
            {routes.map(route => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            {firstPath ? (
              <Route path="*" element={<Navigate to={firstPath} replace />} />
            ) : null}
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

/**
 * The Octopus application shell, built on Ant Design. Self-contained: it
 * provides its own router so the composition root can render it directly.
 *
 * Layout: a full-width header across the top — logo on the left, caller-
 * supplied actions (e.g. the account menu) on the right — above a row split
 * into a collapsible icon-rail sidebar (with hover flyouts for nested items
 * when collapsed) on the left and the routed content on the right.
 */
export function AppLayout(props: AppLayoutProps) {
  return (
    <BrowserRouter>
      <AppLayoutInner {...props} />
    </BrowserRouter>
  );
}
