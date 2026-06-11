import {
  ExtensionDataContainer,
  ExtensionDataRef,
  ExtensionDataValue,
} from '../../index';

export function createExtensionDataContainer<UData extends ExtensionDataRef>(
  values: Iterable<
    UData extends ExtensionDataRef<infer IData, infer IId>
      ? ExtensionDataValue<IData, IId>
      : never
  >,
  contextName: string,
  declaredRefs?: ExtensionDataRef<any, any, any>[],
): ExtensionDataContainer<UData> {
  if (typeof values !== 'object' || !values?.[Symbol.iterator]) {
    throw new Error(`${contextName} did not provide an iterable object`);
  }

  const container = new Map<string, ExtensionDataValue<any, any>>();
  const verifyRefs =
    declaredRefs && new Map(declaredRefs.map(ref => [ref.id, ref]));

  for (const output of values) {
    if (verifyRefs) {
      if (!verifyRefs.delete(output.id)) {
        throw new Error(
          `extension data '${output.id}' was provided but not declared`,
        );
      }
    }
    container.set(output.id, output);
  }

  const remainingRefs =
    verifyRefs &&
    Array.from(verifyRefs.values()).filter(ref => !ref.config.optional);
  if (remainingRefs && remainingRefs.length > 0) {
    throw new Error(
      `missing required extension data value(s) '${remainingRefs
        .map(ref => ref.id)
        .join(', ')}'`,
    );
  }

  return {
    get(ref) {
      return container.get(ref.id)?.value;
    },
    [Symbol.iterator]() {
      return container.values();
    },
  } as ExtensionDataContainer<UData>;
}
