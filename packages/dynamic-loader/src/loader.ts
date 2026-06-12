import {
  loadRemote,
  registerRemotes,
} from '@module-federation/enhanced/runtime';
import type { FrontendFeature } from '@octopus/core-plugin-api';

/** A single remote plugin entry in the dynamic-plugins manifest. */
export interface RemotePluginEntry {
  /** Module Federation remote name (must match the remote's build config). */
  name: string;
  /** URL of the remote's `remoteEntry.js`. */
  entry: string;
  /** Exposed module key to load. Defaults to `'./plugin'`. */
  module?: string;
}

/** A manifest of remote plugins to load at runtime. */
export type RemotePluginManifest = RemotePluginEntry[];

/**
 * Returns true if the value is an Octopus frontend feature (plugin or module).
 *
 * This brand check is why `@octopus/core-plugin-api` MUST be a shared singleton
 * across host and remotes — otherwise the remote's plugin would carry a
 * different `$$type` object identity and fail to be recognised here.
 */
export function isOctopusFeature(value: unknown): value is FrontendFeature {
  if (value && typeof value === 'object' && '$$type' in value) {
    const type = (value as { $$type: unknown }).$$type;
    return (
      type === '@octopus/FrontendPlugin' || type === '@octopus/FrontendModule'
    );
  }
  return false;
}

/**
 * Loads frontend features from a set of Module Federation remotes described by
 * a manifest, and returns the ones that are valid Octopus features.
 *
 * The returned features are fed into `createApp({ features })` exactly like
 * statically-imported plugins — the host does not need to be rebuilt to add a
 * new remote, only the manifest changes.
 */
export async function loadRemoteFeatures(
  manifest: RemotePluginManifest,
): Promise<FrontendFeature[]> {
  if (manifest.length === 0) {
    return [];
  }

  registerRemotes(
    manifest.map(remote => ({ name: remote.name, entry: remote.entry })),
  );

  const results = await Promise.all(
    manifest.map(async remote => {
      const moduleKey = remote.module ?? './plugin';
      const remoteModule = `${remote.name}/${moduleKey.replace(/^\.\//, '')}`;
      try {
        const loaded = (await loadRemote(remoteModule)) as
          | { default?: unknown }
          | undefined;
        const feature = loaded?.default;
        if (!isOctopusFeature(feature)) {
          // eslint-disable-next-line no-console
          console.warn(
            `Remote '${remote.name}' module '${moduleKey}' did not default-export an Octopus feature; skipping.`,
          );
          return undefined;
        }
        return feature;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to load remote plugin '${remote.name}' from '${remote.entry}':`,
          err,
        );
        return undefined;
      }
    }),
  );

  return results.filter((f): f is FrontendFeature => f !== undefined);
}

/**
 * Convenience helper: fetches a JSON manifest from a URL, then loads its remote
 * features.
 */
export async function loadRemoteFeaturesFromUrl(
  manifestUrl: string,
): Promise<FrontendFeature[]> {
  let manifest: RemotePluginManifest;
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    manifest = await response.json();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to fetch dynamic-plugins manifest from '${manifestUrl}':`,
      err,
    );
    return [];
  }
  return loadRemoteFeatures(manifest);
}
