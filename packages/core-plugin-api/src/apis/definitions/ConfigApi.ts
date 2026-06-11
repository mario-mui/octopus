import { createApiRef } from '../system';
import type { Config } from '@octopus/config';

/**
 * The Config API is used to provide a mechanism to access the
 * runtime configuration of the system.
 *
 * @public
 */
export type ConfigApi = Config;

/**
 * The {@link ApiRef} of {@link ConfigApi}.
 *
 * @public
 */
export const configApiRef = createApiRef<ConfigApi>().with({
  id: 'core.config',
  pluginId: 'app',
});
