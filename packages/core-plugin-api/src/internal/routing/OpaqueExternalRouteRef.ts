import { ExternalRouteRef } from '../../index';
import { OpaqueType } from '@octopus/internal-opaque';

export const OpaqueExternalRouteRef = OpaqueType.create<{
  public: ExternalRouteRef;
  versions: {
    readonly version: 'v1';

    getParams(): string[];
    getDescription(): string;
    getDefaultTarget(): string | undefined;

    setId(id: string): void;
  };
}>({
  type: '@octopus/ExternalRouteRef',
  versions: ['v1'],
});
