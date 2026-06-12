// @vitest-environment jsdom
/*
 * Verifies the acp-cluster-namespace plugin end-to-end inside the real app:
 * navigating to the cluster view's Namespaces page resolves `useApi(K8sApi)` and
 * `useApi(K8sPermissionApi)` through the DI container, fetches namespaces from
 * the gateway URL the client builds, and renders them — and the permission
 * review drives the Create button's enabled state.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { acpClusterNamespacePlugin } from '@octopus/acp-cluster-namespace';
import { AppView, createPortalApp } from './App';

const CLUSTERS = [{ metadata: { name: 'global' }, status: { conditions: [] } }];
const NAMESPACES = [
  { metadata: { name: 'default', creationTimestamp: '2026-01-01T00:00:00Z' } },
  { metadata: { name: 'kube-system', creationTimestamp: '2026-01-02T00:00:00Z' } },
];

// Capture the URLs the client hits so we can assert the path-building contract.
const fetchedUrls: string[] = [];

beforeEach(() => {
  window.localStorage.clear();
  fetchedUrls.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      fetchedUrls.push(url);
      if (url.includes('/auth/v1/clusters')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ items: CLUSTERS }), json: async () => ({ items: CLUSTERS }) };
      }
      if (url.includes('/auth/v1/projects')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ items: [] }), json: async () => ({ items: [] }) };
      }
      if (url.includes('/selfsubjectaccessreviews')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ status: { allowed: true } }), json: async () => ({ status: { allowed: true } }) };
      }
      if (url.includes('/api/v1/namespaces')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ kind: 'NamespaceList', apiVersion: 'v1', items: NAMESPACES }),
          json: async () => ({ kind: 'NamespaceList', apiVersion: 'v1', items: NAMESPACES }),
        };
      }
      return { ok: false, status: 404, text: async () => '{}', json: async () => ({}) };
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The namespace plugin is a remote (loaded at runtime in prod); inject it here
// the same way the dynamic loader would, so the integration is still exercised.
const App = () => (
  <AppView app={createPortalApp([acpClusterNamespacePlugin])} />
);

describe('cluster namespace page', () => {
  it('lists namespaces fetched via useApi(K8sApi)', async () => {
    window.history.pushState({}, '', '/console/clusters/global/namespaces');
    render(<App />);

    // The injected client resolved and rendered the fetched rows.
    const defaultLink = await screen.findByText('default');
    expect(screen.getByText('kube-system')).toBeTruthy();

    // The row name is a relative link resolving to the detail route under the
    // plugin's own /namespaces sub-router.
    expect(defaultLink.closest('a')?.getAttribute('href')).toBe(
      '/console/clusters/global/namespaces/detail/default',
    );

    // ...from the exact gateway URL the path builder constructs.
    expect(
      fetchedUrls.some(u =>
        u.includes('/api-gateway/kubernetes/global/api/v1/namespaces'),
      ),
    ).toBe(true);
  });

  it('enables Create when useApi(K8sPermissionApi) allows it', async () => {
    window.history.pushState({}, '', '/console/clusters/global/namespaces');
    render(<App />);

    const createButton = await screen.findByRole('button', {
      name: /Create Namespace/,
    });
    // The SelfSubjectAccessReview returned allowed:true → button is enabled.
    expect(createButton.hasAttribute('disabled')).toBe(false);
    expect(
      fetchedUrls.some(u => u.includes('/selfsubjectaccessreviews')),
    ).toBe(true);
  });
});
