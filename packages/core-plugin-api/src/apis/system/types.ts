/**
 * API reference.
 *
 * @public
 */
export type ApiRef<T, TId extends string = string> = {
  readonly $$type?: '@octopus/ApiRef';
  readonly id: TId;
  readonly T: T;
};

/**
 * Catch-all {@link ApiRef} type.
 *
 * @public
 */
export type AnyApiRef = ApiRef<unknown>;

/**
 * Wraps a type with API properties into a type holding their respective {@link ApiRef}s.
 *
 * @public
 */
export type TypesToApiRefs<T> = { [key in keyof T]: ApiRef<T[key]> };

/**
 * Provides lookup of APIs through their {@link ApiRef}s.
 *
 * @public
 */
export type ApiHolder = {
  get<T>(api: ApiRef<T>): T | undefined;
};

/**
 * Describes type returning API implementations.
 *
 * @public
 */
export type ApiFactory<
  Api,
  Impl extends Api,
  Deps extends { [name in string]: unknown },
> = {
  api: ApiRef<Api>;
  deps: TypesToApiRefs<Deps>;
  factory(deps: Deps): Impl;
};

/**
 * Catch-all {@link ApiFactory} type.
 *
 * @public
 */
export type AnyApiFactory = ApiFactory<
  unknown,
  unknown,
  { [key in string]: unknown }
>;
