import { createApiRef } from '../system';
import { BackstageUserIdentity, ProfileInfo } from './auth';

/**
 * The Identity API used to identify and get information about the signed in user.
 *
 * @public
 */
export type IdentityApi = {
  /**
   * The profile of the signed in user.
   */
  getProfileInfo(): Promise<ProfileInfo>;

  /**
   * User identity information within Backstage.
   */
  getBackstageIdentity(): Promise<BackstageUserIdentity>;

  /**
   * Provides credentials in the form of a token which proves the identity of the signed in user.
   *
   * The token will be undefined if the signed in user does not have a verified
   * identity, such as a demo user or mocked user for e2e tests.
   */
  getCredentials(): Promise<{ token?: string }>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;
};

/**
 * The {@link ApiRef} of {@link IdentityApi}.
 *
 * @public
 */
export const identityApiRef = createApiRef<IdentityApi>().with({
  id: 'core.identity',
  pluginId: 'app',
});
