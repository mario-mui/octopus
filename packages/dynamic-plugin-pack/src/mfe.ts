/*
 * Rsbuild config transforms for Module Federation hosts and remotes — the
 * Rsbuild analogue of the console SDK's `withHostMfeConfig` / `withRemoteMfeConfig`
 * / `withBaseConfig`. Compose them with `compose(...)` (see ./compose).
 */
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { ConfigTransform, mergeConfig } from './compose';

/** The Module Federation options a host/remote declares (see its
 *  `module-federation.config`). Matches the rsbuild MF plugin's option shape. */
export type MfeConfig = Parameters<typeof pluginModuleFederation>[0];

export interface RemoteOptions {
  /** Dev server port; also used to derive the asset prefix. */
  port: number;
  /** Standalone dev entry (the local harness, not the federated surface). */
  devEntry?: string;
  /** Override the asset prefix (defaults to `http://localhost:<port>`). */
  assetPrefix?: string;
}

/** Common base: the React plugin (and any future shared defaults). */
export function withBaseConfig(): ConfigTransform {
  return config => mergeConfig(config, { plugins: [pluginReact()] });
}

/**
 * A remote (a plugin built as an MF remote): exposes its surface and serves the
 * remote entry cross-origin so the host can load it. `dts` is disabled — the
 * host consumes the plugin via its runtime brand, not types.
 */
export function withRemoteMfeConfig(
  mfe: MfeConfig,
  options: RemoteOptions,
): ConfigTransform {
  const assetPrefix =
    options.assetPrefix ?? `http://localhost:${options.port}`;
  return config =>
    mergeConfig(config, {
      plugins: [pluginModuleFederation({ ...mfe, dts: false })],
      ...(options.devEntry
        ? { source: { entry: { index: options.devEntry } } }
        : {}),
      server: { port: options.port },
      dev: { assetPrefix },
      output: { assetPrefix },
    });
}

/**
 * A host: consumes remotes (registered at runtime, so none are declared here)
 * and shares the same singletons. `dts` is disabled to avoid the MF type server.
 */
export function withHostMfeConfig(mfe: MfeConfig): ConfigTransform {
  return config =>
    mergeConfig(config, {
      plugins: [pluginModuleFederation({ ...mfe, dts: false })],
    });
}
