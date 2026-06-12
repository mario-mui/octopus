// @vitest-environment jsdom
/*
 * Verifies the namespace create/update flows in the real app: the form submits
 * through the injected K8sApi to the right gateway URL/method, with the Display
 * Name lifted into the `cpaas.io/display-name` annotation, then navigates to the
 * new/updated resource's detail page.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { acpClusterNamespacePlugin } from '@octopus/acp-cluster-namespace';
import { AppView, createPortalApp } from './App';

const CLUSTERS = [{ metadata: { name: 'global' }, status: { conditions: [] } }];
const EXISTING = {
  kind: 'Namespace',
  apiVersion: 'v1',
  metadata: {
    name: 'default',
    resourceVersion: '42',
    creationTimestamp: '2026-01-01T00:00:00Z',
    labels: { team: 'platform' },
    annotations: { 'cpaas.io/creator': 'admin' },
  },
};

interface Captured {
  method: string;
  url: string;
  body: any;
}
let calls: Captured[] = [];

beforeEach(() => {
  window.localStorage.clear();
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, url, body });
      const ok = (b: unknown) => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(b),
        json: async () => b,
      });
      if (url.includes('/auth/v1/clusters')) return ok({ items: CLUSTERS });
      if (url.includes('/auth/v1/projects')) return ok({ items: [] });
      if (url.includes('/selfsubjectaccessreviews'))
        return ok({ status: { allowed: true } });
      // create (POST collection) echoes the posted body
      if (method === 'POST' && /\/api\/v1\/namespaces$/.test(url)) return ok(body);
      // single resource get / put
      if (/\/api\/v1\/namespaces\/[^/]+$/.test(url)) return ok(EXISTING);
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

describe('namespace create/update', () => {
  it('creates a namespace via POST and navigates to its detail', async () => {
    window.history.pushState({}, '', '/console/clusters/global/namespaces/create');
    render(<App />);

    // First textbox is the Name field (Display Name is the second).
    const name = (await screen.findAllByRole('textbox'))[0];
    fireEvent.change(name, { target: { value: 'newns' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await vi.waitFor(() => {
      const post = calls.find(
        c => c.method === 'POST' && /\/api\/v1\/namespaces$/.test(c.url),
      );
      expect(post?.body?.metadata?.name).toBe('newns');
    });
    await vi.waitFor(() =>
      expect(window.location.pathname).toBe(
        '/console/clusters/global/namespaces/detail/newns',
      ),
    );
  });

  it('updates a namespace via PUT, lifting Display Name into an annotation', async () => {
    window.history.pushState(
      {},
      '',
      '/console/clusters/global/namespaces/update/default',
    );
    render(<App />);

    // In update mode the Name is read-only text, so the first textbox is the
    // Display Name field.
    const displayName = (await screen.findAllByRole('textbox'))[0];
    fireEvent.change(displayName, { target: { value: 'My NS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await vi.waitFor(() => {
      const put = calls.find(
        c => c.method === 'PUT' && /\/api\/v1\/namespaces\/default$/.test(c.url),
      );
      expect(put?.body?.metadata?.annotations?.['cpaas.io/display-name']).toBe(
        'My NS',
      );
    });
    await vi.waitFor(() =>
      expect(window.location.pathname).toBe(
        '/console/clusters/global/namespaces/detail/default',
      ),
    );
  });
});
