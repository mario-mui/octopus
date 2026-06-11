import { ComponentType, PropsWithChildren } from 'react';
import { ApiRef, ApiHolder, TypesToApiRefs } from './types';
import { useVersionedContext } from '@octopus/version-bridge';
import { NotImplementedError } from '@octopus/errors';

const emptyApiHolder: ApiHolder = Object.freeze({ get: () => undefined });

/**
 * React hook for retrieving {@link ApiHolder}, an API catalog.
 *
 * @public
 */
export function useApiHolder(): ApiHolder {
  const versionedHolder = useVersionedContext<{ 1: ApiHolder }>('api-context');
  if (!versionedHolder) {
    return emptyApiHolder;
  }

  const apiHolder = versionedHolder.atVersion(1);
  if (!apiHolder) {
    throw new NotImplementedError('ApiContext v1 not available');
  }
  return apiHolder;
}

/**
 * React hook for retrieving APIs.
 *
 * @param apiRef - Reference of the API to use.
 * @public
 */
export function useApi<T>(apiRef: ApiRef<T>): T {
  const apiHolder = useApiHolder();

  const api = apiHolder.get(apiRef);
  if (!api) {
    throw new NotImplementedError(`No implementation available for ${apiRef}`);
  }
  return api;
}

/**
 * Wrapper for giving component an API context.
 *
 * @param apis - APIs for the context.
 * @deprecated Use `withApis` from `@backstage/core-compat-api` instead.
 * @public
 */
export function withApis<T extends {}>(apis: TypesToApiRefs<T>) {
  return function withApisWrapper<TProps extends T>(
    WrappedComponent: ComponentType<TProps>,
  ) {
    const Hoc = (props: PropsWithChildren<Omit<TProps, keyof T>>) => {
      const apiHolder = useApiHolder();

      const impls = {} as T;

      for (const key in apis) {
        if (apis.hasOwnProperty(key)) {
          const ref = apis[key];

          const api = apiHolder.get(ref);
          if (!api) {
            throw new NotImplementedError(
              `No implementation available for ${ref}`,
            );
          }
          impls[key] = api;
        }
      }

      return <WrappedComponent {...(props as TProps)} {...impls} />;
    };
    const displayName =
      WrappedComponent.displayName || WrappedComponent.name || 'Component';

    Hoc.displayName = `withApis(${displayName})`;

    return Hoc;
  };
}
