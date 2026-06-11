import { RouteRef, SubRouteRef } from '../../index';
import { OpaqueType } from '@octopus/internal-opaque';

export const OpaqueSubRouteRef = OpaqueType.create<{
  public: SubRouteRef;
  versions: {
    readonly version: 'v1';

    getParams(): string[];
    getParent(): RouteRef;
    getDescription(): string;
  };
}>({
  type: '@octopus/SubRouteRef',
  versions: ['v1'],
});
