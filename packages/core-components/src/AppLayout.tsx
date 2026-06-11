import './global.css';
import { ReactNode } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from 'react-router-dom';

const { Header, Sider, Content } = Layout;

/** A navigation entry rendered in the sidebar menu. */
export interface NavItem {
  /** Target path; also used as the menu selection key. */
  to: string;
  title: string;
  icon?: ReactNode;
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
}

function AppLayoutInner({ title = 'Octopus', nav, routes }: AppLayoutProps) {
  const location = useLocation();
  const firstPath = routes[0]?.path;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            height: 48,
            margin: 16,
            color: '#fff',
            fontWeight: 600,
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          🐙 {title}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={nav.map(item => ({
            key: item.to,
            icon: item.icon,
            label: <Link to={item.to}>{item.title}</Link>,
          }))}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', paddingInline: 24 }}>
          <Typography.Title level={4} style={{ margin: '16px 0' }}>
            {nav.find(n => n.to === location.pathname)?.title ?? title}
          </Typography.Title>
        </Header>
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
 */
export function AppLayout(props: AppLayoutProps) {
  return (
    <BrowserRouter>
      <AppLayoutInner {...props} />
    </BrowserRouter>
  );
}
