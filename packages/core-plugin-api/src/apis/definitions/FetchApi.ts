import { createApiRef } from '../system';

/**
 * A wrapper for the fetch API, that has additional behaviors such as the
 * ability to automatically inject auth information where necessary.
 *
 * @public
 */
export type FetchApi = {
  /**
   * The `fetch` implementation.
   */
  fetch: typeof fetch;
};

/**
 * The {@link ApiRef} of {@link FetchApi}.
 *
 * @remarks
 *
 * This is a wrapper for the fetch API, that has additional behaviors such as
 * the ability to automatically inject auth information where necessary.
 *
 * Note that the default behavior of this API (unless overridden by your org),
 * is to require that the user is already signed in so that it has auth
 * information to inject. Therefore, using the default implementation of this
 * utility API e.g. on the `SignInPage` or similar, would cause issues. In
 * special circumstances like those, you can use the regular system `fetch`
 * instead.
 *
 * @public
 */
export const fetchApiRef = createApiRef<FetchApi>().with({
  id: 'core.fetch',
  pluginId: 'app',
});
