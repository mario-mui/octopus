import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadRemoteFeaturesFromUrl } from '@octopus/dynamic-loader';
import { AppView, createPortalApp } from './App';

// Injected by the dev-console rsbuild plugin: the proxy origin in dev, else
// `false`/undefined.
declare const __OCTOPUS_DEV_CONSOLE__: string | false;
const BACKEND_MODE =
  typeof __OCTOPUS_DEV_CONSOLE__ !== 'undefined' &&
  Boolean(__OCTOPUS_DEV_CONSOLE__);

// Loaded via a dynamic import from index.tsx, which gives Module Federation the
// async boundary it needs to initialise shared singletons before app code runs.
async function main() {
  // Backend mode: install the Bearer interceptor and complete any dex callback
  // (?code → id_token) before anything calls the backend. Dynamically imported
  // so production builds never bundle or run it.
  if (BACKEND_MODE) {
    const { setupBackendAuth } = await import('./backendAuth');
    await setupBackendAuth();
  }

  // Load dynamic (Module Federation) plugins listed in the runtime manifest,
  // then compose them with the static plugins. Each remote's `./plugin` bundle
  // is small — its page code is code-split and fetched on first navigation —
  // so eager-loading the plugin definitions keeps first paint light. Failures
  // degrade gracefully to a static-only app.
  const remoteFeatures = await loadRemoteFeaturesFromUrl('/remotes.json');

  const app = createPortalApp(remoteFeatures);

  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root container #root not found');
  }

  createRoot(container).render(
    <StrictMode>
      <AppView app={app} />
    </StrictMode>,
  );
}

void main();
