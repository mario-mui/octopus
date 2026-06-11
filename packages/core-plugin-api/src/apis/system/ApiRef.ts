import { OpaqueApiRef } from '../../internal';
import type { ApiRef } from './types';

/**
 * API reference configuration - holds an ID of the referenced API.
 *
 * @public
 */
export type ApiRefConfig = {
  id: string;
};

type ApiRefBuilderConfig<TId extends string> = {
  id: TId;
  pluginId?: string;
};

function validateId(id: string): void {
  const valid = id
    .split('.')
    .flatMap(part => part.split('-'))
    .every(part => part.match(/^[a-z][a-z0-9]*$/));
  if (!valid) {
    throw new Error(
      `API id must only contain period separated lowercase alphanum tokens with dashes, got '${id}'`,
    );
  }
}

function makeApiRef<T, TId extends string>(
  config: ApiRefBuilderConfig<TId>,
): ApiRef<T, TId> & { readonly $$type: '@octopus/ApiRef' } {
  return OpaqueApiRef.createInstance('v1', {
    id: config.id,
    ...(config.pluginId ? { pluginId: config.pluginId } : {}),
    T: null as unknown as T,
    toString() {
      return `apiRef{${config.id}}`;
    },
  }) as ApiRef<T, TId> & { readonly $$type: '@octopus/ApiRef' };
}

/**
 * Creates a reference to an API.
 *
 * @remarks
 *
 * The `id` is a stable identifier for the API implementation. The frontend
 * system infers the owning plugin for an API from the `id`. When using the
 * builder form, you can instead provide a `pluginId` explicitly. The
 * recommended pattern is `plugin.<plugin-id>.*` (for example,
 * `plugin.catalog.entity-presentation`). This ensures that other plugins can't
 * mistakenly override your API implementation.
 *
 * The recommended way to create an API reference is:
 *
 * ```ts
 * const myApiRef = createApiRef<MyApi>().with({
 *   id: 'my-api',
 *   pluginId: 'my-plugin',
 * });
 * ```
 *
 * The legacy way to create an API reference is:
 *
 * ```ts
 * const myApiRef = createApiRef<MyApi>({ id: 'plugin.my.api' });
 * ```
 *
 * @public
 */
/**
 * Creates a reference to an API.
 *
 * @deprecated Use `createApiRef<T>().with(...)` instead.
 * @public
 */
export function createApiRef<T>(
  config: ApiRefConfig,
): ApiRef<T> & { readonly $$type: '@octopus/ApiRef' };
/**
 * Creates a reference to an API.
 *
 * @remarks
 *
 * Returns a builder with a `.with()` method for providing the API reference
 * configuration.
 *
 * @public
 */
export function createApiRef<T>(): {
  with<const TId extends string>(
    config: ApiRefConfig & { id: TId; pluginId?: string },
  ): ApiRef<T, TId> & {
    readonly $$type: '@octopus/ApiRef';
  };
};
export function createApiRef<T>(config?: ApiRefConfig):
  | (ApiRef<T> & { readonly $$type: '@octopus/ApiRef' })
  | {
      with<const TId extends string>(
        config: ApiRefConfig & { id: TId; pluginId?: string },
      ): ApiRef<T, TId> & {
        readonly $$type: '@octopus/ApiRef';
      };
    } {
  if (config) {
    validateId(config.id);
    return makeApiRef<T, string>(config);
  }
  return {
    with<const TId extends string>(
      withConfig: ApiRefConfig & { id: TId; pluginId?: string },
    ): ApiRef<T, TId> & { readonly $$type: '@octopus/ApiRef' } {
      validateId(withConfig.id);
      return makeApiRef<T, TId>(withConfig);
    },
  };
}
