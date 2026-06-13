import { shared } from '@octopus/dynamic-plugin-pack';

export default {
  name: 'devopsPipeline',
  exposes: {
    // The full plugin. Loaded eagerly by the host but stays small: the pages and
    // the orchestration editor are code-split via React.lazy and fetched on
    // first navigation.
    './plugin': './src/plugin.tsx',
  },
  shared,
};
