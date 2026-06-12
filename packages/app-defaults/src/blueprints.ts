/*
 * Built-in extension blueprints for composing Octopus apps.
 */
import { JSX, ReactNode } from 'react';
import {
  coreExtensionData,
  createExtensionBlueprint,
  IconElement,
  RouteRef,
} from '@octopus/core-plugin-api';
import { ViewId, viewRoutePattern } from '@octopus/console-core-common';

/**
 * Creates a routable page. The resulting extension attaches to the app layout's
 * `routes` input.
 *
 * A page carries its own `title` and `icon`; the sidebar navigation is
 * auto-derived from every page that declares a title — there is no separate
 * nav-item blueprint (matching Octopus's current frontend system, where
 * standalone nav items are legacy and nav content is discovered from pages).
 *
 * Pages may declare the `view` they belong to (a canonical view id such as
 * `'application'`, `'cluster'` or `'platform'`). The sidebar splits into those
 * top-level views (a vertical rail); each view loads the nav of the pages that
 * declared it. Pages without a `view` fall into the first/default view.
 *
 * @example
 * PageBlueprint.make({
 *   name: 'home',
 *   params: { path: '/', title: 'Home', icon: <HomeOutlined />, view: 'application', element: <HomePage /> },
 * })
 */
export const PageBlueprint = createExtensionBlueprint({
  kind: 'page',
  attachTo: { id: 'app/layout', input: 'routes' },
  output: [
    coreExtensionData.routePath,
    coreExtensionData.reactElement,
    coreExtensionData.title.optional(),
    coreExtensionData.navLabel.optional(),
    coreExtensionData.icon.optional(),
    coreExtensionData.navGroup.optional(),
    coreExtensionData.routeRef.optional(),
  ],
  *factory(params: {
    /** Path within the view (e.g. `'workloads'`; `'/'` is the view index). */
    path: string;
    /** Plain-text title; also the nav label unless `navLabel` is given. */
    title?: string;
    /**
     * Rendered nav label, shown instead of `title`. Pass a component using
     * `useTranslationRef` for an internationalized label.
     */
    navLabel?: ReactNode;
    icon?: IconElement;
    /** Canonical view id this page belongs to (e.g. `'application'`). */
    view?: string;
    element: JSX.Element;
    /** Optional route ref so other plugins can link here without the path. */
    routeRef?: RouteRef;
  }) {
    // With a view, the mounted path is the view's URL space prefixed onto the
    // page's sub-path (e.g. application + '' → /console/applications/:projectName).
    const routePath = params.view
      ? viewRoutePattern(params.view as ViewId, params.path)
      : params.path;
    yield coreExtensionData.routePath(routePath);
    yield coreExtensionData.reactElement(params.element);
    if (params.title) {
      yield coreExtensionData.title(params.title);
    }
    if (params.navLabel !== undefined) {
      yield coreExtensionData.navLabel(params.navLabel);
    }
    if (params.icon) {
      yield coreExtensionData.icon(params.icon);
    }
    if (params.view) {
      yield coreExtensionData.navGroup(params.view);
    }
    if (params.routeRef) {
      yield coreExtensionData.routeRef(params.routeRef);
    }
  },
});
