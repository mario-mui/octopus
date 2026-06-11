/** @public */
export type ExtensionDataValue<TData, TId extends string> = {
  readonly $$type: '@octopus/ExtensionDataValue';
  readonly id: TId;
  readonly value: TData;
};

/** @public */
export type ExtensionDataRef<
  TData = unknown,
  TId extends string = string,
  TConfig extends { optional?: true } = { optional?: true },
> = {
  readonly $$type: '@octopus/ExtensionDataRef';
  readonly id: TId;
  readonly T: TData;
  readonly config: TConfig;
};

/** @ignore */
export type ExtensionDataRefToValue<TDataRef extends ExtensionDataRef> =
  TDataRef extends ExtensionDataRef<infer IData, infer IId, any>
    ? ExtensionDataValue<IData, IId>
    : never;

/** @public */
export interface ConfigurableExtensionDataRef<
  TData,
  TId extends string,
  TConfig extends { optional?: true } = {},
> extends ExtensionDataRef<TData, TId, TConfig> {
  optional(): ConfigurableExtensionDataRef<
    TData,
    TId,
    TConfig & { optional: true }
  >;
  (t: TData): ExtensionDataValue<TData, TId>;
}

/** @public */
export function createExtensionDataRef<TData>(): {
  with<TId extends string>(options: {
    id: TId;
  }): ConfigurableExtensionDataRef<TData, TId>;
} {
  const createRef = <TId extends string>(refId: TId) =>
    Object.assign(
      (value: TData): ExtensionDataValue<TData, TId> => ({
        $$type: '@octopus/ExtensionDataValue',
        id: refId,
        value,
      }),
      {
        id: refId,
        $$type: '@octopus/ExtensionDataRef',
        config: {},
        optional() {
          return {
            ...this,
            config: { ...this.config, optional: true },
          };
        },
        toString() {
          const optional = Boolean(this.config.optional);
          return `ExtensionDataRef{id=${refId},optional=${optional}}`;
        },
      } as ConfigurableExtensionDataRef<TData, TId, { optional?: true }>,
    );
  return {
    with<TId extends string>(options: { id: TId }) {
      return createRef(options.id);
    },
  };
}
