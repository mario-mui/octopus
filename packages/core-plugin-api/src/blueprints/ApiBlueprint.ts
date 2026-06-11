import { AnyApiFactory, ApiFactory } from '../apis/system';
import { createExtensionBlueprint, createExtensionDataRef } from '../wiring';
import { createExtensionBlueprintParams } from '../wiring/createExtensionBlueprint';

const factoryDataRef = createExtensionDataRef<AnyApiFactory>().with({
  id: 'core.api.factory',
});

/**
 * Creates utility API extensions.
 *
 * @public
 */
export const ApiBlueprint = createExtensionBlueprint({
  kind: 'api',
  attachTo: { id: 'root', input: 'apis' },
  output: [factoryDataRef],
  dataRefs: {
    factory: factoryDataRef,
  },
  defineParams: <
    TApi,
    TImpl extends TApi,
    TDeps extends { [name in string]: unknown },
  >(
    params: ApiFactory<TApi, TImpl, TDeps>,
  ) => createExtensionBlueprintParams(params as AnyApiFactory),
  *factory(params) {
    yield factoryDataRef(params);
  },
});
