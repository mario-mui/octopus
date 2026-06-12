/*
 * Build helpers for Octopus Module Federation hosts and dynamic (remote)
 * plugins: a shared `shared` config plus composable Rsbuild transforms, so a
 * host or remote's `rsbuild.config.ts` stays a few lines.
 *
 * @packageDocumentation
 */

export { shared } from './shared';
export { compose, mergeConfig } from './compose';
export type { ConfigTransform } from './compose';
export {
  withBaseConfig,
  withHostMfeConfig,
  withRemoteMfeConfig,
} from './mfe';
export type { MfeConfig, RemoteOptions } from './mfe';
