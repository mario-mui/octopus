import { describe, it, expect, vi, beforeEach } from 'vitest';

const registerRemotes = vi.fn();
const loadRemote = vi.fn(async (key: string) => {
  switch (key) {
    case 'remoteDemo/plugin':
      return { default: { $$type: '@octopus/FrontendPlugin', pluginId: 'demo' } };
    case 'broken/plugin':
      return { default: { notAFeature: true } };
    case 'throws/plugin':
      throw new Error('network boom');
    default:
      return undefined;
  }
});

vi.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: (...args: unknown[]) => registerRemotes(...args),
  loadRemote: (key: string) => loadRemote(key),
}));

import { loadRemoteFeatures, isOctopusFeature } from './loader';

beforeEach(() => {
  registerRemotes.mockClear();
  loadRemote.mockClear();
});

describe('isOctopusFeature', () => {
  it('accepts plugins and modules by brand, rejects everything else', () => {
    expect(isOctopusFeature({ $$type: '@octopus/FrontendPlugin' })).toBe(true);
    expect(isOctopusFeature({ $$type: '@octopus/FrontendModule' })).toBe(true);
    expect(isOctopusFeature({ $$type: '@backstage/FrontendPlugin' })).toBe(false);
    expect(isOctopusFeature({ notAFeature: true })).toBe(false);
    expect(isOctopusFeature(null)).toBe(false);
    expect(isOctopusFeature(undefined)).toBe(false);
  });
});

describe('loadRemoteFeatures', () => {
  it('registers remotes and returns valid default-exported features', async () => {
    const features = await loadRemoteFeatures([
      { name: 'remoteDemo', entry: 'http://host/remoteEntry.js' },
    ]);

    expect(registerRemotes).toHaveBeenCalledWith([
      { name: 'remoteDemo', entry: 'http://host/remoteEntry.js' },
    ]);
    expect(features).toHaveLength(1);
    expect((features[0] as { pluginId: string }).pluginId).toBe('demo');
  });

  it('skips remotes that do not export a valid feature, and ones that throw', async () => {
    const features = await loadRemoteFeatures([
      { name: 'remoteDemo', entry: 'a' },
      { name: 'broken', entry: 'b' },
      { name: 'throws', entry: 'c' },
    ]);

    expect(features).toHaveLength(1);
    expect((features[0] as { pluginId: string }).pluginId).toBe('demo');
  });

  it('honours a custom module key', async () => {
    await loadRemoteFeatures([
      { name: 'remoteDemo', entry: 'a', module: './plugin' },
    ]);
    expect(loadRemote).toHaveBeenCalledWith('remoteDemo/plugin');
  });

  it('no-ops on an empty manifest', async () => {
    const features = await loadRemoteFeatures([]);
    expect(features).toEqual([]);
    expect(registerRemotes).not.toHaveBeenCalled();
  });
});
