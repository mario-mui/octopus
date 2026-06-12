import { ExtensionDefinition } from './createExtension';
import { ExtensionDataRef, ExtensionDataValue } from './createExtensionDataRef';
import { FrontendModule } from './createFrontendModule';
import { FrontendPlugin } from './createFrontendPlugin';

/**
 * Feature flag configuration.
 *
 * @public
 */
export type FeatureFlagConfig = {
  /** Feature flag name */
  name: string;
  /** Feature flag description */
  description?: string;
};

/** @public */
export type ExtensionMap<
  TExtensionMap extends { [id in string]: ExtensionDefinition },
> = {
  get<TId extends keyof TExtensionMap>(id: TId): TExtensionMap[TId];
};

/** @public */
export type ExtensionDataContainer<UExtensionData extends ExtensionDataRef> =
  Iterable<
    UExtensionData extends ExtensionDataRef<
      infer IData,
      infer IId,
      infer IConfig
    >
      ? IConfig['optional'] extends true
        ? never
        : ExtensionDataValue<IData, IId>
      : never
  > & {
    get<TId extends UExtensionData['id']>(
      ref: ExtensionDataRef<any, TId, any>,
    ): UExtensionData extends ExtensionDataRef<infer IData, TId, infer IConfig>
      ? IConfig['optional'] extends true
        ? IData | undefined
        : IData
      : never;
  };

/** @public  */
export type FrontendFeature =
  | (Omit<FrontendPlugin, 'pluginId'> & { pluginId?: string })
  | FrontendModule;
