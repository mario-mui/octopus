import { JSX } from 'react';
import { createApiRef } from '../system';

/**
 * API for retrieving plugin-scoped header actions.
 *
 * @remarks
 *
 * Header actions are provided via
 * {@link @octopus/core-plugin-api#PluginHeaderActionBlueprint}
 * and automatically scoped to the providing plugin.
 *
 * @public
 */
export type PluginHeaderActionsApi = {
  /**
   * Returns the header actions for a given plugin.
   */
  getPluginHeaderActions(pluginId: string): Array<JSX.Element | null>;
};

/**
 * The `ApiRef` of {@link PluginHeaderActionsApi}.
 *
 * @public
 */
export const pluginHeaderActionsApiRef =
  createApiRef<PluginHeaderActionsApi>().with({
    id: 'core.plugin-header-actions',
    pluginId: 'app',
  });
