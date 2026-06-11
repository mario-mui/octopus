import { JsonObject } from '@octopus/types';
import {
  ApiHolder,
  AppNode,
  ExtensionDataContainer,
  ExtensionDataRef,
  ExtensionDataValue,
} from '@octopus/core-plugin-api';

/** @public */
export type ExtensionFactoryMiddleware = (
  originalFactory: (contextOverrides?: {
    config?: JsonObject;
  }) => ExtensionDataContainer<ExtensionDataRef>,
  context: {
    node: AppNode;
    apis: ApiHolder;
    config?: JsonObject;
  },
) => Iterable<ExtensionDataValue<any, any>>;
