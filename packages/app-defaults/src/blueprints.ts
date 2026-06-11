/*
 * Built-in extension blueprints for composing Octopus apps.
 */
import { JSX } from 'react';
import {
  coreExtensionData,
  createExtensionBlueprint,
  IconElement,
  RouteRef,
} from '@octopus/core-plugin-api';

/**
 * Creates a routable page. The resulting extension attaches to the app layout's
 * `routes` input.
 *
 * A page carries its own `title` and `icon`; the sidebar navigation is
 * auto-derived from every page that declares a title — there is no separate
 * nav-item blueprint (matching Octopus's current frontend system, where
 * standalone nav items are legacy and nav content is discovered from pages).
 *
 * @example
 * PageBlueprint.make({
 *   name: 'home',
 *   params: { path: '/', title: 'Home', icon: <HomeOutlined />, element: <HomePage /> },
 * })
 */
export const PageBlueprint = createExtensionBlueprint({
  kind: 'page',
  attachTo: { id: 'app/layout', input: 'routes' },
  output: [
    coreExtensionData.routePath,
    coreExtensionData.reactElement,
    coreExtensionData.title.optional(),
    coreExtensionData.icon.optional(),
    coreExtensionData.routeRef.optional(),
  ],
  *factory(params: {
    path: string;
    title?: string;
    icon?: IconElement;
    element: JSX.Element;
    /** Optional route ref so other plugins can link here without the path. */
    routeRef?: RouteRef;
  }) {
    yield coreExtensionData.routePath(params.path);
    yield coreExtensionData.reactElement(params.element);
    if (params.title) {
      yield coreExtensionData.title(params.title);
    }
    if (params.icon) {
      yield coreExtensionData.icon(params.icon);
    }
    if (params.routeRef) {
      yield coreExtensionData.routeRef(params.routeRef);
    }
  },
});
