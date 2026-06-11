import type { ApiRef } from '../../index';
import { OpaqueType } from '@octopus/internal-opaque';

export const OpaqueApiRef = OpaqueType.create<{
  public: ApiRef<unknown> & {
    readonly $$type: '@octopus/ApiRef';
  };
  versions: {
    readonly version: 'v1';
    readonly pluginId?: string;
  };
}>({
  type: '@octopus/ApiRef',
  versions: ['v1'],
});
