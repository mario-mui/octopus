/**
 * Core API used by Octopus frontend plugins.
 *
 * Ported from Backstage's @backstage/frontend-plugin-api (Apache-2.0), with the
 * UI layer (components / blueprints / translation) removed — those are rebuilt
 * on Ant Design in @octopus/core-components.
 *
 * @packageDocumentation
 */

export * from './analytics';
export * from './apis';
export * from './blueprints';
export * from './icons';
export * from './routing';
export * from './schema';
export * from './apis/system';
export * from './translation';
export * from './wiring';
// Opaque-type bridges (merged from the former @octopus/internal-frontend),
// consumed by @octopus/core-app-api.
export * from './internal';

export type {
  ProgressProps,
  NotFoundErrorPageProps,
  ErrorDisplayProps,
} from './types';
