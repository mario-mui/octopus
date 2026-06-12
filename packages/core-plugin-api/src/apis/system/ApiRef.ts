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
 * system infers the owning plugin for an API from the `id`. You can instead
 * provide a `pluginId` explicitly. The recommended pattern is
 * `plugin.<plugin-id>.*` (for example, `plugin.catalog.entity-presentation`).
 * This ensures that other plugins can't mistakenly override your API
 * implementation.
 *
 * ```ts
 * const myApiRef = createApiRef<MyApi>().with({
 *   id: 'my-api',
 *   pluginId: 'my-plugin',
 * });
 * ```
 *
 * @public
 */
export function createApiRef<T>(): {
  with<const TId extends string>(
    config: ApiRefConfig & { id: TId; pluginId?: string },
  ): ApiRef<T, TId> & {
    readonly $$type: '@octopus/ApiRef';
  };
} {
  return {
    with<const TId extends string>(
      withConfig: ApiRefConfig & { id: TId; pluginId?: string },
    ): ApiRef<T, TId> & { readonly $$type: '@octopus/ApiRef' } {
      validateId(withConfig.id);
      return makeApiRef<T, TId>(withConfig);
    },
  };
}
