// @vitest-environment jsdom
/*
 * Full render test: composes the real app (createApp + appPlugin + homePlugin)
 * and renders it into jsdom, verifying the Ant Design shell, routing, and
 * auto-derived sidebar all work end-to-end.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  within,
  fireEvent,
} from '@testing-library/react';
import { AppView, createPortalApp } from './App';

afterEach(cleanup);

// Renders the portal composed from static plugins only (no remotes in tests).
const App = () => <AppView app={createPortalApp()} />;

describe('portal app', () => {
  it('renders the home page from the static plugin at the root route', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(
      screen.getByText('This page was contributed by a static plugin'),
    ).toBeTruthy();
  });

  it('resolves the app-info utility API through DI and renders its values', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    // "v0.0.0" (getVersion) only appears if useApi resolved the factory
    // provided via ApiBlueprint through the DI container.
    expect(screen.getByText('v0.0.0')).toBeTruthy();
    expect(screen.getAllByText(/Octopus/).length).toBeGreaterThan(0);
  });

  it('reads static config through the builtin configApi', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    // "Acme Corp" comes only from createApp({ config }) via configApiRef.
    expect(screen.getByText('Acme Corp')).toBeTruthy();
  });

  it('resolves a link from a route ref (decoupled routing)', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    // HomePage links to Settings via settingsRouteRef — the resolver maps it to
    // the concrete /settings path, no hard-coded URL in the page.
    const link = screen.getByRole('link', { name: /Open Settings/ });
    expect(link.getAttribute('href')).toBe('/settings');
  });

  it('renders translated text via the i18n translationApi', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    // Default (English) messages — proves useTranslationRef + translationApi +
    // appLanguageApi are all wired through the DI container.
    expect(screen.getByText(/Welcome to Octopus/)).toBeTruthy();
    expect(
      screen.getByText(/A plugin-based frontend framework/),
    ).toBeTruthy();
  });

  it('switches language and lazy-loads German translations', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    // Open the account menu, expand the Language submenu, and choose German.
    fireEvent.click(screen.getByText('Guest'));
    fireEvent.click(await screen.findByText('Language'));
    fireEvent.click(await screen.findByText('DE'));

    // The German bundle loads asynchronously, then the text updates.
    expect(await screen.findByText(/Willkommen bei Octopus/)).toBeTruthy();
  });

  it('auto-derives the sidebar nav from page titles', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    const menu = document.querySelector('.ant-menu');
    expect(menu).toBeTruthy();
    expect(within(menu as HTMLElement).getByText('Home')).toBeTruthy();
    expect(within(menu as HTMLElement).getByText('Settings')).toBeTruthy();
  });

  it('renders the settings page at /settings', () => {
    window.history.pushState({}, '', '/settings');
    render(<App />);

    expect(screen.getByText('Ant Design 5')).toBeTruthy();
  });
});
