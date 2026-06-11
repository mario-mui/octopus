import { createDevApp } from '@octopus/dev-utils';
import remoteDemoPlugin from '../src';

// Run this remote plugin standalone (with the full app shell) via `pnpm dev`.
createDevApp({ features: [remoteDemoPlugin] });
