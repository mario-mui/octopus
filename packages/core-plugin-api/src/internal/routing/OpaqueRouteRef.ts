import { RouteRef } from '../../index';
import { OpaqueType } from '@octopus/internal-opaque';

export const OpaqueRouteRef = OpaqueType.create<{
  public: RouteRef;
  versions: {
    readonly version: 'v1';

    getParams(): string[];
    getDescription(): string;

    alias: string | undefined;

    setId(id: string): void;
  };
}>({
  type: '@octopus/RouteRef',
  versions: ['v1'],
});
