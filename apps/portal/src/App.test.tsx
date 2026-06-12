// @vitest-environment jsdom
/*
 * Full render test: composes the real app (createApp + appPlugin + homePlugin)
 * and renders it into jsdom, verifying the Ant Design shell, the view-scoped
 * routing (/console/<view>/…), and the auto-derived sidebar all work
 * end-to-end. Project/cluster lists are fetched, so fetch is stubbed; the
 * application view redirects to a default project, hence the async queries.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  within,
  fireEvent,
} from '@testing-library/react';
import { AppView, createPortalApp } from './App';

const PROJECTS = [
  { metadata: { name: 'kychen' }, status: { phase: 'Active' } },
  { metadata: { name: 'demo' }, status: { phase: 'Active' } },
];
const CLUSTERS = [{ metadata: { name: 'global' }, status: { conditions: [] } }];

beforeEach(() => {
  window.localStorage.clear();
  // Stub the project/cluster list endpoints; our fetch code only reads
  // `ok`/`status`/`json()`.
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/v1/clusters')) {
        return { ok: true, status: 200, json: async () => ({ items: CLUSTERS }) };
      }
      if (url.includes('/auth/v1/projects')) {
        return { ok: true, status: 200, json: async () => ({ items: PROJECTS }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Renders the portal composed from static plugins only (no remotes in tests).
const App = () => <AppView app={createPortalApp()} />;

describe('portal app', () => {
  it('redirects "/" to the application view and renders the home page', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    // "/" → /console/applications → default project → view index → home page.
    expect(
      await screen.findByText('This page was contributed by a static plugin'),
    ).toBeTruthy();
    expect(window.location.pathname).toBe(
      '/console/applications/kychen/home',
    );
  });

  it('resolves the app-info utility API through DI and renders its values', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    await screen.findByText('This page was contributed by a static plugin');
    expect(screen.getByText('v0.0.0')).toBeTruthy();
    expect(screen.getAllByText(/Octopus/).length).toBeGreaterThan(0);
  });

  it('reads static config through the builtin configApi', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByText('Acme Corp')).toBeTruthy();
  });

  it('resolves a link from a route ref (decoupled routing)', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    // HomePage links to Settings via settingsRouteRef — the resolver maps it to
    // the concrete /console/platform path, no hard-coded URL in the page.
    const link = await screen.findByRole('link', { name: /Open Settings/ });
    expect(link.getAttribute('href')).toBe('/console/platform');
  });

  it('renders translated text via the i18n translationApi', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByText(/Welcome to Octopus/)).toBeTruthy();
    expect(
      screen.getByText(/A plugin-based frontend framework/),
    ).toBeTruthy();
  });

  it('switches language and lazy-loads German translations', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    await screen.findByText(/Welcome to Octopus/);

    // Open the account menu (its trigger shows the user's email), hover the
    // Language submenu (it opens on hover), and choose German.
    fireEvent.click(await screen.findByText('dev@octopus.local'));
    const language = await screen.findByText('Language');
    fireEvent.mouseEnter(
      language.closest('.ant-menu-submenu-title') ?? language,
    );
    fireEvent.click(await screen.findByText('DE'));

    expect(await screen.findByText(/Willkommen bei Octopus/)).toBeTruthy();
  });

  it('shows the three fixed views in the rail, with the active view\'s nav', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    await screen.findByText('This page was contributed by a static plugin');

    // The rail surfaces every top-level view.
    const rail = screen.getByRole('tablist', { name: 'navigation groups' });
    expect(within(rail).getByText('Application')).toBeTruthy();
    expect(within(rail).getByText('Cluster')).toBeTruthy();
    expect(within(rail).getByText('Platform')).toBeTruthy();

    // In the application view the menu lists Home — but not Settings, which
    // lives under the (inactive) Platform view.
    const menu = document.querySelector('.ant-menu');
    expect(menu).toBeTruthy();
    expect(within(menu as HTMLElement).getByText('Home')).toBeTruthy();
    expect(within(menu as HTMLElement).queryByText('Settings')).toBeNull();
  });

  it('renders the platform view and its nav at /console/platform', async () => {
    window.history.pushState({}, '', '/console/platform');
    render(<App />);

    // Platform view: its page (Settings) renders and its menu lists Settings.
    expect(await screen.findByText('Ant Design 5')).toBeTruthy();
    const menu = document.querySelector('.ant-menu');
    expect(within(menu as HTMLElement).getByText('Settings')).toBeTruthy();
    expect(within(menu as HTMLElement).queryByText('Home')).toBeNull();
  });
});
