import { createDevApp } from '@octopus/dev-utils';
import { setupMonaco } from '@octopus/code-editor/setup';
import { devopsPipelinePlugin } from '../src';

// Standalone dev has no host, so set monaco up here (the portal host does this
// in production). Run this remote plugin standalone via `pnpm dev`.
setupMonaco();

createDevApp({ features: [devopsPipelinePlugin] });
