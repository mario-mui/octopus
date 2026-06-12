import { shared } from '@octopus/dynamic-plugin-pack';

export default {
  name: 'acpClusterNamespace',
  exposes: {
    // The full plugin. It is loaded eagerly by the host, but stays small: its
    // page code is code-split via React.lazy and fetched on first navigation.
    './plugin': './src/plugin.tsx',
  },
  shared,
};
