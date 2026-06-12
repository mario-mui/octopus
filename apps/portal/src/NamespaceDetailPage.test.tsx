// @vitest-environment jsdom
/*
 * Verifies the namespace detail page in the real app: it fetches the single
 * namespace via the injected K8sApi, renders the Basic Info, keeps the sidebar
 * entry highlighted, navigates back via the breadcrumb, and gates Delete (in the
 * Actions menu) behind the permission review.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import { acpClusterNamespacePlugin } from '@octopus/acp-cluster-namespace';
import { AppView, createPortalApp } from './App';

const CLUSTERS = [{ metadata: { name: 'global' }, status: { conditions: [] } }];
const NAMESPACE = {
  kind: 'Namespace',
  apiVersion: 'v1',
  metadata: {
    name: 'default',
    creationTimestamp: '2026-01-01T00:00:00Z',
    labels: { team: 'platform' },
    annotations: { 'cpaas.io/creator': 'admin' },
  },
  status: { phase: 'Active' },
};

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const ok = (body: unknown) => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
        json: async () => body,
      });
      if (url.includes('/auth/v1/clusters')) return ok({ items: CLUSTERS });
      if (url.includes('/auth/v1/projects')) return ok({ items: [] });
      if (url.includes('/selfsubjectaccessreviews'))
        return ok({ status: { allowed: true } });
      if (/\/api\/v1\/namespaces\/default$/.test(url)) return ok(NAMESPACE);
      return { ok: false, status: 404, text: async () => '{}', json: async () => ({}) };
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const App = () => (
  <AppView app={createPortalApp([acpClusterNamespacePlugin])} />
);
const gotoDetail = () =>
  window.history.pushState(
    {},
    '',
    '/console/clusters/global/namespaces/detail/default',
  );

describe('cluster namespace detail page', () => {
  it('renders the basic info fetched via useApi(K8sApi)', async () => {
    gotoDetail();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'default' })).toBeTruthy();
    expect(screen.getByText('team: platform')).toBeTruthy();
    expect(screen.getByText('admin')).toBeTruthy();
    expect(screen.getByText('2026-01-01 00:00:00')).toBeTruthy();
  });

  it('keeps the Namespaces sidebar item selected on the detail page', async () => {
    gotoDetail();
    render(<App />);

    await screen.findByRole('heading', { name: 'default' });
    const navLabel = screen
      .getAllByText('Namespaces')
      .find(el => el.closest('.ant-menu-item'));
    expect(navLabel?.closest('.ant-menu-item-selected')).toBeTruthy();
  });

  it('returns to the list via the breadcrumb', async () => {
    gotoDetail();
    render(<App />);

    await screen.findByRole('heading', { name: 'default' });
    const breadcrumb = screen
      .getAllByRole('link', { name: /Namespaces/ })
      .find(link => !link.closest('.ant-menu'));
    fireEvent.click(breadcrumb!);
    expect(window.location.pathname).toBe('/console/clusters/global/namespaces');
  });

  it('opens the type-to-confirm delete dialog from the Actions menu', async () => {
    gotoDetail();
    render(<App />);

    await screen.findByRole('heading', { name: 'default' });
    fireEvent.click(screen.getByRole('button', { name: /Actions/ }));
    fireEvent.click(await screen.findByText('Delete'));

    // The dialog requires typing the exact name; Delete is disabled until then.
    expect(await screen.findByText('Delete Namespace')).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Delete' });
    expect(confirm).toHaveProperty('disabled', true);
  });
});
