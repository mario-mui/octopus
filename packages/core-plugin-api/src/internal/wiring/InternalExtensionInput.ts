import { ExtensionInput } from '../../index';
import { OpaqueType } from '@octopus/internal-opaque';

export type ExtensionInputContext = {
  input: string;
  kind?: string;
  name?: string;
};

export const OpaqueExtensionInput = OpaqueType.create<{
  public: ExtensionInput;
  versions: {
    readonly version: undefined;
    readonly context?: ExtensionInputContext;
    withContext?(context: ExtensionInputContext): ExtensionInput;
  };
}>({
  type: '@octopus/ExtensionInput',
  versions: [undefined],
});
