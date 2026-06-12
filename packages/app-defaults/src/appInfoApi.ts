/*
 * A tiny example utility API, used to demonstrate the dependency-injection
 * container end-to-end (provided via ApiBlueprint, consumed via useApi).
 */
import { createApiRef } from '@octopus/core-plugin-api';

export interface AppInfoApi {
  getTitle(): string;
  getVersion(): string;
}

export const appInfoApiRef = createApiRef<AppInfoApi>().with({
  id: 'app.info',
});
