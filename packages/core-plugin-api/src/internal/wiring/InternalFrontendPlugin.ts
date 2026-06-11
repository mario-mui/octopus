import {
  Extension,
  FeatureFlagConfig,
  IconElement,
  OverridableFrontendPlugin,
} from '../../index';
import { FilterPredicate } from '@octopus/filter-predicates';
import { JsonObject } from '@octopus/types';
import { OpaqueType } from '@octopus/internal-opaque';

export const OpaqueFrontendPlugin = OpaqueType.create<{
  public: OverridableFrontendPlugin;
  versions: {
    readonly version: 'v1';
    readonly title?: string;
    readonly icon?: IconElement;
    readonly extensions: Extension<unknown>[];
    readonly featureFlags: FeatureFlagConfig[];
    readonly if?: FilterPredicate;
    readonly infoOptions?: {
      packageJson?: () => Promise<JsonObject>;
      manifest?: () => Promise<JsonObject>;
    };
  };
}>({
  type: '@octopus/FrontendPlugin',
  versions: ['v1'],
});
