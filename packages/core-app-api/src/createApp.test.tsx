/*
 * End-to-end wiring tests for the Octopus composition root. These validate that
 * the ported tree pipeline actually instantiates extensions, wires inputs to
 * outputs across the tree, applies config defaults, and reports errors.
 */
import React from 'react';
import { z } from 'zod';
import { describe, it, expect } from 'vitest';
import {
  ApiBlueprint,
  coreExtensionData,
  configApiRef,
  createExtension,
  createExtensionDataRef,
  createExtensionInput,
  createExternalRouteRef,
  createFrontendPlugin,
  createRouteRef,
  fetchApiRef,
  routeResolutionApiRef,
  RouteRef,
} from '@octopus/core-plugin-api';
import { createApp } from './createApp';

// A simple data ref used to wire nav-item titles up into the app shell.
const titleRef = createExtensionDataRef<string>().with({ id: 'test.title' });

/**
 * App shell: attaches to the builtin root's `app` input, collects any number of
 * nav-item titles via its own `items` input, and emits a React element whose
 * prop encodes the wired titles so the test can assert on the result.
 */
function makeAppShell() {
  return createExtension({
    name: 'app-shell',
    attachTo: { id: 'root', input: 'app' },
    inputs: {
      items: createExtensionInput([titleRef]),
    },
    output: [coreExtensionData.reactElement],
    factory: ({ inputs }) => {
      const titles = inputs.items.map(i => i.get(titleRef));
      return [
        coreExtensionData.reactElement(
          React.createElement('div', { 'data-titles': titles.join(',') }),
        ),
      ];
    },
  });
}

function makeNavItem(name: string, title?: string) {
  return createExtension({
    kind: 'nav-item',
    name,
    attachTo: { id: 'portal/app-shell', input: 'items' },
    output: [titleRef],
    configSchema: {
      title: z.string().default(title ?? name),
    },
    factory: ({ config }) => [titleRef(config.title)],
  });
}

// The raw app-shell element produced by the tree (createApp wraps the rendered
// root in an ApiProvider; for wiring assertions we read the tree output directly).
function appShellElement(app: ReturnType<typeof createApp>): React.ReactElement {
  return app.tree.root.instance?.getData(
    coreExtensionData.reactElement,
  ) as React.ReactElement;
}

describe('createApp wiring', () => {
  it('wires a single app-shell into the root and exposes its element', () => {
    const portal = createFrontendPlugin({
      pluginId: 'portal',
      extensions: [makeAppShell()],
    });

    const app = createApp({ features: [portal] });

    expect(app.errors).toEqual([]);
    expect(React.isValidElement(app.getRootElement())).toBe(true);
    expect(appShellElement(app).props['data-titles']).toBe('');
  });

  it('wires multiple nav items up into the app shell input', () => {
    const portal = createFrontendPlugin({
      pluginId: 'portal',
      extensions: [
        makeAppShell(),
        makeNavItem('home', 'Home'),
        makeNavItem('settings', 'Settings'),
      ],
    });

    const app = createApp({ features: [portal] });

    expect(app.errors).toEqual([]);
    const titles = (appShellElement(app).props['data-titles'] as string)
      .split(',')
      .sort();
    expect(titles).toEqual(['Home', 'Settings']);
  });

  it('applies extension config schema defaults', () => {
    const portal = createFrontendPlugin({
      pluginId: 'portal',
      // nav item with no explicit title falls back to the schema default (name)
      extensions: [makeAppShell(), makeNavItem('dashboard')],
    });

    const app = createApp({ features: [portal] });

    expect(appShellElement(app).props['data-titles']).toBe('dashboard');
  });

  it('places every resolved extension in the tree node map', () => {
    const portal = createFrontendPlugin({
      pluginId: 'portal',
      extensions: [makeAppShell(), makeNavItem('home')],
    });

    const app = createApp({ features: [portal] });

    expect(app.tree.nodes.has('root')).toBe(true);
    expect(app.tree.nodes.has('portal/app-shell')).toBe(true);
    expect(app.tree.nodes.has('nav-item:portal/home')).toBe(true);
  });
});

describe('createApp builtin utility APIs', () => {
  const withShell = (extensions: unknown[] = []) =>
    createFrontendPlugin({
      pluginId: 'portal',
      extensions: [makeAppShell(), ...(extensions as never[])],
    });

  it('exposes a configApi backed by the passed config (no backend)', () => {
    const app = createApp({
      config: { app: { title: 'Octopus QA' } },
      features: [withShell()],
    });
    expect(app.apis.get(configApiRef)?.getString('app.title')).toBe('Octopus QA');
  });

  it('exposes a fetchApi by default', () => {
    const app = createApp({ features: [withShell()] });
    expect(typeof app.apis.get(fetchApiRef)?.fetch).toBe('function');
  });

  it('lets a plugin override a builtin api (primary wins over fallback)', () => {
    const marker = (() => Promise.resolve(new Response())) as typeof fetch;
    const customFetch = ApiBlueprint.make({
      name: 'fetch',
      params: defineParams =>
        defineParams({
          api: fetchApiRef,
          deps: {},
          factory: () => ({ fetch: marker }),
        }),
    });

    const app = createApp({ features: [withShell([customFetch])] });
    expect(app.apis.get(fetchApiRef)?.fetch).toBe(marker);
  });
});

describe('createApp decoupled routing', () => {
  // A shell that accepts pages (path + element + route ref) on a `routes` input.
  const routesShell = () =>
    createExtension({
      name: 'app-shell',
      attachTo: { id: 'root', input: 'app' },
      inputs: {
        routes: createExtensionInput([
          coreExtensionData.routePath,
          coreExtensionData.reactElement,
          coreExtensionData.routeRef.optional(),
        ]),
      },
      output: [coreExtensionData.reactElement],
      factory: () => [coreExtensionData.reactElement(React.createElement('div'))],
    });

  const page = (name: string, path: string, ref: RouteRef) =>
    createExtension({
      kind: 'page',
      name,
      attachTo: { id: 'producer/app-shell', input: 'routes' },
      output: [
        coreExtensionData.routePath,
        coreExtensionData.reactElement,
        coreExtensionData.routeRef.optional(),
      ],
      factory: () => [
        coreExtensionData.routePath(path),
        coreExtensionData.reactElement(React.createElement('div')),
        coreExtensionData.routeRef(ref),
      ],
    });

  it('resolves a route ref to its concrete path', () => {
    const settings = createRouteRef();
    const producer = createFrontendPlugin({
      pluginId: 'producer',
      routes: { settings },
      extensions: [routesShell(), page('settings', '/settings', settings)],
    });

    const app = createApp({ features: [producer] });
    const resolve = app.apis.get(routeResolutionApiRef)!;
    expect(resolve.resolve(settings)?.()).toBe('/settings');
  });

  it('resolves an external route ref through a binding', () => {
    const settings = createRouteRef();
    const extSettings = createExternalRouteRef();
    const producer = createFrontendPlugin({
      pluginId: 'producer',
      routes: { settings },
      extensions: [routesShell(), page('settings', '/settings', settings)],
    });
    const consumer = createFrontendPlugin({
      pluginId: 'consumer',
      externalRoutes: { settings: extSettings },
      extensions: [],
    });

    const app = createApp({
      features: [producer, consumer],
      bindRoutes: ({ bind }) => bind(consumer.externalRoutes, { settings }),
    });

    const resolve = app.apis.get(routeResolutionApiRef)!;
    expect(resolve.resolve(extSettings)?.()).toBe('/settings');
  });
});
