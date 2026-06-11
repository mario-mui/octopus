import {
  ApiHolder,
  AppNode,
  ExtensionDefinitionAttachTo,
  ExtensionDataValue,
  ExtensionDataRef,
  OverridableExtensionDefinition,
  ExtensionDefinitionParameters,
  ExtensionInput,
  PortableSchema,
} from '../../index';
// eslint-disable-next-line @backstage/no-relative-monorepo-imports
import { ResolvedExtensionInputs } from '../../index';
import { OpaqueType } from '@octopus/internal-opaque';
import { FilterPredicate } from '@octopus/filter-predicates';

export const OpaqueExtensionDefinition = OpaqueType.create<{
  public: OverridableExtensionDefinition<ExtensionDefinitionParameters>;
  versions:
    | {
        readonly version: 'v1';
        readonly kind?: string;
        readonly namespace?: string;
        readonly name?: string;
        readonly attachTo: ExtensionDefinitionAttachTo;
        readonly disabled: boolean;
        readonly configSchema?: PortableSchema<any, any>;
        readonly inputs: {
          [inputName in string]: {
            $$type: '@octopus/ExtensionInput';
            extensionData: {
              [name in string]: ExtensionDataRef;
            };
            config: { optional: boolean; singleton: boolean };
          };
        };
        readonly output: {
          [name in string]: ExtensionDataRef;
        };
        factory(context: {
          node: AppNode;
          apis: ApiHolder;
          config: object;
          inputs: {
            [inputName in string]: unknown;
          };
        }): {
          [inputName in string]: unknown;
        };
      }
    | {
        readonly version: 'v2';
        readonly kind?: string;
        readonly namespace?: string;
        readonly name?: string;
        readonly attachTo: ExtensionDefinitionAttachTo;
        readonly disabled: boolean;
        readonly if?: FilterPredicate;
        readonly configSchema?: PortableSchema<any, any>;
        readonly inputs: { [inputName in string]: ExtensionInput };
        readonly output: Array<ExtensionDataRef>;
        factory(context: {
          node: AppNode;
          apis: ApiHolder;
          config: object;
          inputs: ResolvedExtensionInputs<{
            [inputName in string]: ExtensionInput;
          }>;
        }): Iterable<ExtensionDataValue<any, any>>;
      };
}>({
  type: '@octopus/ExtensionDefinition',
  versions: ['v1', 'v2'],
});
