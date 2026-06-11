import { ComponentType, ReactNode } from 'react';
import { createApiRef } from '../system';

/**
 * The Plugin Wrapper API allows plugins to wrap their extensions with
 * providers. This API is only intended for internal use by the Backstage
 * frontend system. To provide contexts to plugin components, use
 * `ExtensionBoundary` instead.
 *
 * @public
 */
export type PluginWrapperApi = {
  /**
   * Returns the root wrapper that manages the global plugin state across
   * plugin wrapper instances.
   */
  getRootWrapper(): ComponentType<{ children: ReactNode }>;

  /**
   * Returns a wrapper component for a specific plugin, or undefined if no
   * wrappers exist. Do not use this API directly, instead use
   * `ExtensionBoundary` to wrap your plugin components if needed.
   */
  getPluginWrapper(
    pluginId: string,
  ): ComponentType<{ children: ReactNode }> | undefined;
};

/**
 * The API reference of {@link PluginWrapperApi}.
 *
 * @public
 */
export const pluginWrapperApiRef = createApiRef<PluginWrapperApi>().with({
  id: 'core.plugin-wrapper',
  pluginId: 'app',
});
