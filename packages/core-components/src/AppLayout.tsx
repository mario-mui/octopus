import './global.css';
import { ReactNode, useState } from 'react';
import { Layout, Menu } from 'antd';
import { createStyles } from 'antd-style';
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
  useNavigate,
  useParams,
  Navigate,
} from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const HEADER_HEIGHT = 60;
const SIDER_WIDTH = 280;
/** Horizontal padding applied to the sidebar content (selector, menu, toggle). */
const SIDER_PADDING_INLINE = 10;
// Wide enough for the inline-collapsed menu to show its icons cleanly.
const SIDER_COLLAPSED_WIDTH = 80;

/*
 * Scoped styles (antd-style). `&&&` bumps specificity so our overrides beat
 * antd's component defaults — Layout's Header/Sider/Menu otherwise default to a
 * dark background, and the menu carries its own right border. The group rail's
 * visuals live in global.css (`.octo-rail`); here we only feed it theme colours
 * as CSS variables.
 */
const useStyles = createStyles(({ token, css }) => ({
  root: css`
    min-height: 100vh;
  `,
  header: css`
    &&& {
      height: ${HEADER_HEIGHT}px;
      line-height: ${HEADER_HEIGHT}px;
      padding-inline: 24px;
      background: ${token.colorBgContainer};
      border-block-end: 1px solid ${token.colorBorderSecondary};
      display: flex;
      align-items: center;
      gap: 16px;
      position: sticky;
      inset-block-start: 0;
      z-index: 10;
    }
  `,
  brand: css`
    display: flex;
    align-items: center;
    font-weight: 600;
    font-size: 18px;
    color: ${token.colorText};
    white-space: nowrap;
  `,
  logo: css`
    height: 32px;
  `,
  brandTitle: css`
    margin-inline-start: 8px;
  `,
  spacer: css`
    flex: 1;
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  sider: css`
    &&& {
      background: ${token.colorBgContainer};
      border-inline-end: 1px solid ${token.colorBorderSecondary};
      height: calc(100vh - ${HEADER_HEIGHT}px);
      position: sticky;
      inset-block-start: ${HEADER_HEIGHT}px;
    }
  `,
  siderRow: css`
    display: flex;
    height: 100%;
  `,
  rail: css`
    --octo-rail-bg: ${token.colorFillSecondary};
    --octo-content-bg: ${token.colorBgContainer};
    --octo-tab-color: ${token.colorTextSecondary};
    /* Selected/hovered tab uses the normal text colour (distinguished by
       weight), not the primary blue. */
    --octo-tab-active-color: ${token.colorText};
  `,
  column: css`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    height: 100%;
    padding-inline: ${SIDER_PADDING_INLINE}px;
  `,
  menu: css`
    &&& {
      background: transparent;
      border-inline-end: 0;
      flex: 1;
      overflow-y: auto;
    }
  `,
  toggleBar: css`
    display: flex;
    justify-content: flex-end;
    padding: 8px 0;
    border-block-start: 1px solid ${token.colorBorderSecondary};
  `,
  toggle: css`
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${token.borderRadius}px;
    font-size: 16px;
    cursor: pointer;
    /* Follows the theme, so it stays light on a dark sidebar. */
    color: ${token.colorText};
  `,
  content: css`
    margin: 24px;
  `,
}));

/** A navigation entry rendered in the sidebar menu. Supports nesting. */
export interface NavItem {
  /** Target path; also used as the menu selection key. */
  to: string;
  /** Rendered menu label — plain text or a node (e.g. a translated label). */
  title: ReactNode;
  icon?: ReactNode;
  /**
   * The top-level view/group this entry belongs to (e.g. a view id like
   * `'application'`). Items sharing a value are shown together under one tab in
   * the sidebar's rail. Without an explicit list of {@link NavView}s, entries
   * are bucketed by this value in first-seen order, a missing value falls into a
   * shared default group, and the rail hides when everything resolves to one.
   */
  group?: string;
  /** Child entries rendered as a (possibly hover-flyout) submenu. */
  children?: NavItem[];
}

/**
 * A fixed top-level view shown in the sidebar rail. When `AppLayout` is given a
 * list of these, the rail always renders exactly them, in order, and each loads
 * the nav items whose `group` matches its `id`.
 */
export interface NavView {
  /** Stable id, matched against {@link NavItem.group}. */
  id: string;
  /** Label shown on the rail tab. */
  label: string;
  /** URL prefix the view owns, e.g. `/console/applications`. */
  basePath: string;
  /**
   * Route param holding the view's selected resource, e.g. `projectName`. The
   * nav items' `to` are patterns containing `:param`; the layout substitutes the
   * current value (read from the URL) to build concrete links.
   */
  param?: string;
}

/** Items sharing a top-level view, with the label to show in the rail. */
interface NavGroup {
  /** Group key (a view id), used for selection and as the rail tab key. */
  key: string;
  /** Displayed label in the rail. */
  label: string;
  items: NavItem[];
}

/** Fallback group for entries that don't declare one. */
const DEFAULT_GROUP = 'General';
/** Width of the group rail; must match `.octo-rail` in global.css. */
const RAIL_WIDTH = 36;

/** Bucket nav items into groups, preserving the order groups first appear. */
function groupNav(nav: NavItem[]): NavGroup[] {
  const groups: NavGroup[] = [];
  const byKey = new Map<string, NavGroup>();
  for (const item of nav) {
    const key = item.group ?? DEFAULT_GROUP;
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: key, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/**
 * Bucket nav into a fixed, ordered set of views. Every view is kept (so the rail
 * always shows them all); items without a matching `group` fall into the first
 * view. This is the three-views model: each view loads its own navigation.
 */
function viewGroups(nav: NavItem[], views: NavView[]): NavGroup[] {
  const fallback = views[0]?.id;
  return views.map(view => ({
    key: view.id,
    label: view.label,
    items: nav.filter(item => (item.group ?? fallback) === view.id),
  }));
}

/** Whether `pathname` targets this item or any of its descendants. */
function navItemMatchesPath(item: NavItem, pathname: string): boolean {
  if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
    return true;
  }
  return (item.children ?? []).some(child =>
    navItemMatchesPath(child, pathname),
  );
}

/** The first leaf path within a group, used as the target when selecting it. */
function firstPathInGroup(group: NavGroup): string | undefined {
  const walk = (items: NavItem[]): string | undefined => {
    for (const item of items) {
      if (item.children?.length) {
        const nested = walk(item.children);
        if (nested) {
          return nested;
        }
      } else {
        return item.to;
      }
    }
    return undefined;
  };
  return walk(group.items);
}

/** A routable page rendered in the content area. */
export interface AppRoute {
  path: string;
  element: ReactNode;
}

/**
 * Redirect a view's bare resource URL (e.g. `/console/applications/:projectName`)
 * to its first page, carrying the current resource. Used when a view's pages are
 * all sub-paths and there is no page mounted at the index itself.
 */
function ViewIndexRedirect({
  param,
  firstPattern,
}: {
  param: string;
  firstPattern: string;
}) {
  const params = useParams();
  const value = params[param] ?? '';
  return <Navigate to={firstPattern.replace(`:${param}`, value)} replace />;
}

export interface AppLayoutProps {
  title?: string;
  nav: NavItem[];
  routes: AppRoute[];
  /**
   * The fixed top-level views shown in the sidebar rail, in order. When
   * provided, the rail always renders exactly these and each loads the nav
   * whose `group` matches its `id`. Omit to auto-derive groups from the nav.
   */
  views?: NavView[];
  /** Content rendered on the right side of the header (e.g. account menu). */
  headerActions?: ReactNode;
  /**
   * Content rendered at the top of the sidebar, above the navigation menu (e.g.
   * a project selector). Receives the sidebar's `collapsed` state and the active
   * view's id, so a caller can render a view-specific selector (a project
   * selector in the application view, a cluster selector in the cluster view…).
   */
  sidebarHeader?: (state: {
    collapsed: boolean;
    view?: string;
  }) => ReactNode;
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
  title = 'Alauda Container Platform',
  nav,
  routes,
  views,
  headerActions,
  sidebarHeader,
}: AppLayoutProps) {
  const { styles, cx } = useStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const firstPath = routes[0]?.path;
  const [collapsed, setCollapsed] = useState(false);

  // Bucket the nav into top-level views/groups. With a fixed `views` list the
  // rail always shows those views; otherwise it is auto-derived and only shown
  // when there is more than one group. The menu lists the active view's items.
  const groups = views ? viewGroups(nav, views) : groupNav(nav);
  const showRail = views ? views.length > 1 : groups.length > 1;

  // With fixed views, the active view — and its selected resource — come from
  // the URL prefix (the URL is the source of truth). Otherwise the active group
  // is whichever one matches the current path.
  const currentView = views?.find(
    view =>
      location.pathname === view.basePath ||
      location.pathname.startsWith(`${view.basePath}/`),
  );
  const contextValue =
    currentView?.param &&
    location.pathname.startsWith(`${currentView.basePath}/`)
      ? location.pathname.slice(currentView.basePath.length + 1).split('/')[0]
      : undefined;

  const activeGroup = views
    ? groups.find(group => group.key === currentView?.id) ?? groups[0]
    : groups.find(group =>
        group.items.some(item =>
          navItemMatchesPath(item, location.pathname),
        ),
      ) ?? groups[0];

  // In views mode the nav `to` are route patterns (…/:projectName/…); resolve
  // them against the active resource so links point at the current project.
  const resolveHref = (to: string): string =>
    currentView?.param
      ? to.replace(`:${currentView.param}`, contextValue ?? '')
      : to;
  const withHref = (items: NavItem[]): NavItem[] =>
    items.map(item => ({
      ...item,
      to: resolveHref(item.to),
      children: item.children ? withHref(item.children) : undefined,
    }));

  const rawMenuNav = showRail ? activeGroup?.items ?? [] : nav;
  const menuNav = views ? withHref(rawMenuNav) : rawMenuNav;

  // Highlight the nav entry that owns the current path. A page may render its
  // own sub-routes (e.g. …/namespaces/detail/:name), so match the longest `to`
  // that is the current path or a prefix of it, rather than an exact pathname.
  const menuTargets = (items: NavItem[]): string[] =>
    items.flatMap(item => [
      item.to,
      ...(item.children ? menuTargets(item.children) : []),
    ]);
  const selectedKey = menuTargets(menuNav)
    .filter(
      to =>
        location.pathname === to || location.pathname.startsWith(`${to}/`),
    )
    .sort((a, b) => b.length - a.length)[0];
  // Parent submenus (entries with children) start expanded, so a nested page is
  // visible without first clicking its parent.
  const openKeys = menuNav.filter(item => item.children?.length).map(item => item.to);
  const siderCollapsedWidth = showRail
    ? RAIL_WIDTH + SIDER_COLLAPSED_WIDTH
    : SIDER_COLLAPSED_WIDTH;

  // For a resource view whose pages are all sub-paths (no page at the bare
  // `…/:param` index), redirect that index to the view's first page.
  const indexRedirects = (views ?? [])
    .filter(view => view.param)
    .flatMap(view => {
      const items = groups.find(group => group.key === view.id)?.items ?? [];
      const indexPattern = `${view.basePath}/:${view.param}`;
      if (!items.length || items.some(item => item.to === indexPattern)) {
        return [];
      }
      return [{ param: view.param as string, indexPattern, first: items[0].to }];
    });

  return (
    <Layout className={styles.root}>
      {/* Full-width header across the top: logo on the left, actions on the right. */}
      <Header className={styles.header}>
        <div className={styles.brand}>
          <img
            alt="logo"
            src="/console/api/v1/cm/ui-logos/logo"
            className={styles.logo}
          />
          <span className={styles.brandTitle}>{title}</span>
        </div>
        <div className={styles.spacer} />
        <div className={styles.actions}>{headerActions}</div>
      </Header>

      {/* Below the header: sidebar nav on the left, content on the right. */}
      <Layout hasSider>
        {/* No fixed `theme` prop: the sidebar follows the active light/dark
            algorithm via tokens, so it darkens with the rest of the app. */}
        <Sider
          width={SIDER_WIDTH}
          collapsedWidth={siderCollapsedWidth}
          collapsed={collapsed}
          breakpoint="lg"
          onBreakpoint={broken => setCollapsed(broken)}
          className={styles.sider}
        >
          {/* Row: optional group rail on the left, then a flex column holding
              the active group's menu above the collapse toggle. */}
          <div className={styles.siderRow}>
            {showRail ? (
              <div
                role="tablist"
                aria-label="navigation groups"
                className={cx('octo-rail', styles.rail)}
              >
                {groups.map(group => {
                  const selected = group.key === activeGroup?.key;
                  const select = () => {
                    // In views mode, switching view goes to its base URL and the
                    // view's selector redirects to a default resource.
                    const view = views?.find(v => v.id === group.key);
                    const target = view ? view.basePath : firstPathInGroup(group);
                    if (target) {
                      navigate(target);
                    }
                  };
                  return (
                    <div
                      key={group.key}
                      role="tab"
                      aria-selected={selected}
                      tabIndex={0}
                      title={group.label}
                      className={`octo-rail-tab${selected ? ' active' : ''}`}
                      onClick={select}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          select();
                        }
                      }}
                    >
                      <span>{group.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className={styles.column}>
              {/* View selector (or any caller-supplied header) sits at the top
                  of the sidebar, above the navigation — keyed to the active view
                  so the right selector (project / cluster / …) renders. */}
              {sidebarHeader?.({ collapsed, view: currentView?.id })}

              <Menu
                mode="inline"
                inlineCollapsed={collapsed}
                defaultOpenKeys={openKeys}
                selectedKeys={selectedKey ? [selectedKey] : []}
                items={toMenuItems(menuNav)}
                className={styles.menu}
              />

              {/* Collapse toggle pinned to the bottom-right corner of the rail. */}
              <div className={styles.toggleBar}>
                <div
                  role="button"
                  aria-label={
                    collapsed ? 'expand sidebar' : 'collapse sidebar'
                  }
                  aria-expanded={!collapsed}
                  tabIndex={0}
                  onClick={() => setCollapsed(c => !c)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCollapsed(c => !c);
                    }
                  }}
                  className={styles.toggle}
                >
                  {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </div>
              </div>
            </div>
          </div>
        </Sider>

        <Content className={styles.content}>
          <Routes>
            {routes.map(route => (
              // Append `/*` so a contributed page can own nested routes — its
              // element may render its own <Routes> for sub-pages (e.g. a list
              // and a detail). The splat-empty case still matches the page, and
              // the nav links use the bare path. React Router ranks static
              // segments above the splat, so sibling pages aren't shadowed.
              <Route
                key={route.path}
                path={
                  route.path === '/' || route.path.endsWith('/*')
                    ? route.path
                    : `${route.path.replace(/\/$/, '')}/*`
                }
                element={route.element}
              />
            ))}
            {views ? (
              <>
                {views
                  .filter(view => view.param)
                  .map(view => (
                    // The bare view base renders nothing; its selector redirects
                    // to a default resource (…/applications → …/applications/x).
                    <Route key={view.basePath} path={view.basePath} element={<></>} />
                  ))}
                {indexRedirects.map(redirect => (
                  // …/applications/:projectName → …/applications/:projectName/home
                  <Route
                    key={redirect.indexPattern}
                    path={redirect.indexPattern}
                    element={
                      <ViewIndexRedirect
                        param={redirect.param}
                        firstPattern={redirect.first}
                      />
                    }
                  />
                ))}
                <Route
                  path="/"
                  element={<Navigate to={views[0].basePath} replace />}
                />
                <Route
                  path="*"
                  element={<Navigate to={views[0].basePath} replace />}
                />
              </>
            ) : firstPath ? (
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
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AppLayoutInner {...props} />
    </BrowserRouter>
  );
}
