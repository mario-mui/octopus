import { shared } from '@octopus/dynamic-plugin-pack';

export default {
  name: 'host',
  // Remotes are loaded at runtime from /remotes.json, not declared statically.
  remotes: {},
  shared,
};
