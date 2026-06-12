import { createDevApp } from '@octopus/dev-utils';
import { acpClusterNamespacePlugin } from '../src';

// Run this remote plugin standalone (with the full app shell) via `pnpm dev`.
createDevApp({ features: [acpClusterNamespacePlugin] });
