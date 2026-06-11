import { AppNode } from '../apis';
import { Expand } from '@octopus/types';
import { createExtensionDataContainer } from '../internal';
import {
  ExtensionDataRefToValue,
  ExtensionDataValue,
} from './createExtensionDataRef';
import { ExtensionInput } from './createExtensionInput';
import { ExtensionDataContainer } from './types';

/** @ignore */
export type ResolvedInputValueOverrides<
  TInputs extends { [inputName in string]: ExtensionInput } = {
    [inputName in string]: ExtensionInput;
  },
> = Expand<
  {
    [KName in keyof TInputs as TInputs[KName] extends ExtensionInput<
      any,
      {
        optional: infer IOptional extends boolean;
        singleton: boolean;
        internal?: boolean;
      }
    >
      ? IOptional extends true
        ? never
        : KName
      : never]: TInputs[KName] extends ExtensionInput<
      infer IDataRefs,
      {
        optional: boolean;
        singleton: infer ISingleton extends boolean;
        internal?: boolean;
      }
    >
      ? ISingleton extends true
        ? Iterable<ExtensionDataRefToValue<IDataRefs>>
        : Array<Iterable<ExtensionDataRefToValue<IDataRefs>>>
      : never;
  } & {
    [KName in keyof TInputs as TInputs[KName] extends ExtensionInput<
      any,
      {
        optional: infer IOptional extends boolean;
        singleton: boolean;
        internal?: boolean;
      }
    >
      ? IOptional extends true
        ? KName
        : never
      : never]?: TInputs[KName] extends ExtensionInput<
      infer IDataRefs,
      {
        optional: boolean;
        singleton: infer ISingleton extends boolean;
        internal?: boolean;
      }
    >
      ? ISingleton extends true
        ? Iterable<ExtensionDataRefToValue<IDataRefs>>
        : Array<Iterable<ExtensionDataRefToValue<IDataRefs>>>
      : never;
  }
>;

function expectArray<T>(value: T | T[]): T[] {
  return value as T[];
}
function expectItem<T>(value: T | T[]): T {
  return value as T;
}

/** @internal */
export function resolveInputOverrides(
  declaredInputs?: { [inputName in string]: ExtensionInput },
  inputs?: {
    [KName in string]?:
      | ({ node: AppNode } & ExtensionDataContainer<any>)
      | Array<{ node: AppNode } & ExtensionDataContainer<any>>;
  },
  inputOverrides?: ResolvedInputValueOverrides,
) {
  if (!declaredInputs || !inputs || !inputOverrides) {
    return inputs;
  }

  const newInputs: typeof inputs = {};
  for (const name in declaredInputs) {
    if (!Object.hasOwn(declaredInputs, name)) {
      continue;
    }
    const declaredInput = declaredInputs[name];
    const providedData = inputOverrides[name];
    if (declaredInput.config.singleton) {
      const originalInput = expectItem(inputs[name]);
      if (providedData) {
        const providedContainer = createExtensionDataContainer(
          providedData as Iterable<ExtensionDataValue<any, any>>,
          'extension input override',
          declaredInput.extensionData,
        );
        if (!originalInput) {
          throw new Error(
            `attempted to override data of input '${name}' but it is not present in the original inputs`,
          );
        }
        newInputs[name] = Object.assign(providedContainer, {
          node: (originalInput as { node: AppNode }).node,
        }) as any;
      }
    } else {
      const originalInput = expectArray(inputs[name]);
      if (!Array.isArray(providedData)) {
        throw new Error(
          `override data provided for input '${name}' must be an array`,
        );
      }

      // Regular inputs can be overridden in two different ways:
      // 1) Forward a subset of the original inputs in a new order
      // 2) Provide new data for each original input

      // First check if all inputs are being removed
      if (providedData.length === 0) {
        newInputs[name] = [];
      } else {
        // Check how many of the provided data items have a node property, i.e. is a forwarded input
        const withNodesCount = providedData.filter(d => 'node' in d).length;
        if (withNodesCount === 0) {
          if (originalInput.length !== providedData.length) {
            throw new Error(
              `override data provided for input '${name}' must match the length of the original inputs`,
            );
          }
          newInputs[name] = providedData.map((data, i) => {
            const providedContainer = createExtensionDataContainer(
              data as Iterable<ExtensionDataValue<any, any>>,
              'extension input override',
              declaredInput.extensionData,
            );
            return Object.assign(providedContainer, {
              node: (originalInput[i] as { node: AppNode }).node,
            }) as any;
          });
        } else if (withNodesCount === providedData.length) {
          newInputs[name] = providedData as any;
        } else {
          throw new Error(
            `override data for input '${name}' may not mix forwarded inputs with data overrides`,
          );
        }
      }
    }
  }
  return newInputs;
}
