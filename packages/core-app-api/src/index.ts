/**
 * The Octopus app composition root: collects frontend features into an
 * instantiated extension tree.
 *
 * The tree-resolution algorithm (resolveAppNodeSpecs / resolveAppTree /
 * instantiateAppNodeTree) is ported from Backstage's @backstage/frontend-app-api
 * (Apache-2.0). The composition root itself (createApp) is a lean Octopus
 * implementation.
 *
 * @packageDocumentation
 */

export { createApp } from './createApp';
export type {
  CreateAppOptions,
  OctopusApp,
  AppWiringError,
} from './createApp';
export { Root } from './coreExtensions';
export { AppThemeSelector } from './apis/implementations/AppThemeApi/AppThemeSelector';
