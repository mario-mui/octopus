import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadRemoteFeaturesFromUrl } from '@octopus/dynamic-loader';
import { AppView, createPortalApp } from './App';

// Loaded via a dynamic import from index.tsx, which gives Module Federation the
// async boundary it needs to initialise shared singletons before app code runs.
async function main() {
  // Load dynamic (Module Federation) plugins listed in the runtime manifest,
  // then compose them with the static plugins. Failures degrade gracefully to
  // a static-only app.
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
