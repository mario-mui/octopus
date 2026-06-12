import { shared } from '@octopus/dynamic-plugin-pack';

export default {
  name: 'remoteDemo',
  exposes: {
    './plugin': './src/plugin.tsx',
  },
  shared,
};
