/*
 * Smoke test for the ported extension engine. Validates that the vendored
 * wiring primitives run at runtime (not just typecheck): data refs, extensions,
 * inputs, plugins, and opaque introspection.
 */
import { describe, it, expect } from 'vitest';
import {
  createExtension,
  createExtensionDataRef,
  createExtensionInput,
  createFrontendPlugin,
} from './index';
import { OpaqueFrontendPlugin } from './internal';

const nameDataRef = createExtensionDataRef<string>().with({ id: 'test.name' });

describe('ported extension engine', () => {
  it('creates a data ref with an id', () => {
    expect(nameDataRef.id).toBe('test.name');
  });

  it('creates an extension definition with the octopus brand', () => {
    const ext = createExtension({
      name: 'greeter',
      attachTo: { id: 'app/root', input: 'content' },
      output: [nameDataRef],
      factory: () => [nameDataRef('hello')],
    });
    expect((ext as any).$$type).toBe('@octopus/ExtensionDefinition');
  });

  it('supports inputs with octopus brand', () => {
    const input = createExtensionInput([nameDataRef], { singleton: true });
    expect((input as any).$$type).toBe('@octopus/ExtensionInput');
  });

  it('creates a plugin and exposes its extensions via the opaque bridge', () => {
    const greeter = createExtension({
      name: 'greeter',
      attachTo: { id: 'app/nav', input: 'items' },
      output: [nameDataRef],
      factory: () => [nameDataRef('hello')],
    });

    const plugin = createFrontendPlugin({
      pluginId: 'demo',
      extensions: [greeter],
    });

    expect(plugin.pluginId).toBe('demo');
    expect((plugin as any).$$type).toBe('@octopus/FrontendPlugin');

    const internal = OpaqueFrontendPlugin.toInternal(plugin);
    const ids = internal.extensions.map(e => e.id);
    // extension id follows [<kind>:][<namespace>][/][<name>]; namespace = pluginId
    expect(ids.some(id => id.includes('demo'))).toBe(true);
  });
});
