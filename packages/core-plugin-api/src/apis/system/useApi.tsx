import { ApiRef, ApiHolder } from './types';
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

