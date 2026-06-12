import type { RsbuildConfig } from '@rsbuild/core';

/** A composable Rsbuild config transform: takes a config and returns it merged. */
export type ConfigTransform = (config: RsbuildConfig) => RsbuildConfig;

/**
 * Compose config transforms right-to-left, like the console SDK's `compose`:
 * `compose(withMfe, withBase)` applies `withBase` first (the base), then layers
 * `withMfe` on top. Start from `{}` (or a partial config) to build the final
 * Rsbuild config.
 */
export function compose(...transforms: ConfigTransform[]): ConfigTransform {
  return config =>
    transforms.reduceRight((acc, transform) => transform(acc), config);
}

/** Shallow-merge two Rsbuild configs, concatenating `plugins` and merging the
 *  common nested sections so transforms layer cleanly. */
export function mergeConfig(
  base: RsbuildConfig,
  extra: RsbuildConfig,
): RsbuildConfig {
  return {
    ...base,
    ...extra,
    plugins: [...(base.plugins ?? []), ...(extra.plugins ?? [])],
    source: { ...base.source, ...extra.source },
    server: { ...base.server, ...extra.server },
    dev: { ...base.dev, ...extra.dev },
    output: { ...base.output, ...extra.output },
    html: { ...base.html, ...extra.html },
  };
}
