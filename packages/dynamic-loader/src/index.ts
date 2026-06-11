/*
 * Host-side Module Federation runtime loader for dynamic Octopus plugins.
 *
 * @packageDocumentation
 */

export {
  loadRemoteFeatures,
  loadRemoteFeaturesFromUrl,
  isOctopusFeature,
} from './loader';
export type { RemotePluginEntry, RemotePluginManifest } from './loader';
