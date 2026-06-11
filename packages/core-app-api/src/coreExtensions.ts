import {
  ApiBlueprint,
  coreExtensionData,
  createExtension,
  createExtensionInput,
} from '@octopus/core-plugin-api';

/**
 * The builtin root extension of every Octopus app. It is resolved with the
 * namespace `'root'`, which gives it the reserved node id `'root'` that the
 * app tree is rooted at.
 *
 * It exposes two inputs:
 * - `app`: the application's React root element (provided by the Ant Design app
 *   shell via {@link @octopus/app-defaults#appPlugin}).
 * - `apis`: utility API factories contributed via {@link ApiBlueprint}. These
 *   are collected by `createApp` into the dependency-injection container.
 */
export const Root = createExtension({
  attachTo: { id: 'ignored', input: 'ignored' },
  inputs: {
    app: createExtensionInput([coreExtensionData.reactElement], {
      singleton: true,
    }),
    apis: createExtensionInput([ApiBlueprint.dataRefs.factory]),
  },
  output: [coreExtensionData.reactElement],
  factory: ({ inputs }) => inputs.app,
});
