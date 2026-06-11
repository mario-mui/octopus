import { createApiRef } from '../system';

/**
 * The discovery API is used to provide a mechanism for plugins to
 * discover the endpoint to use to talk to their backend counterpart.
 *
 * @remarks
 *
 * The purpose of the discovery API is to allow for many different deployment
 * setups and routing methods through a central configuration, instead
 * of letting each individual plugin manage that configuration.
 *
 * Implementations of the discovery API can be a simple as a URL pattern
 * using the pluginId, but could also have overrides for individual plugins,
 * or query a separate discovery service.
 *
 * @public
 */
export type DiscoveryApi = {
  /**
   * Returns the HTTP base backend URL for a given plugin, without a trailing slash.
   *
   * This method must always be called just before making a request, as opposed to
   * fetching the URL when constructing an API client. That is to ensure that more
   * flexible routing patterns can be supported.
   *
   * For example, asking for the URL for `auth` may return something
   * like `https://backstage.example.com/api/auth`
   */
  getBaseUrl(pluginId: string): Promise<string>;
};

/**
 * The {@link ApiRef} of {@link DiscoveryApi}.
 *
 * @public
 */
export const discoveryApiRef = createApiRef<DiscoveryApi>().with({
  id: 'core.discovery',
  pluginId: 'app',
});
