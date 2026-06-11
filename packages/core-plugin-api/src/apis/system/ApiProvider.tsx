import { ReactNode } from 'react';
import {
  createVersionedContext,
  createVersionedValueMap,
} from '@octopus/version-bridge';
import { ApiHolder } from './types';

// Shares the same versioned context key that `useApiHolder` reads, so the
// holder published here is visible to `useApi` anywhere below the provider.
// The context is a cross-bundle global singleton (important for M3 / Module
// Federation: host and remotes resolve the same React context instance).
const ApiContext = createVersionedContext<{ 1: ApiHolder }>('api-context');

/** Props for {@link ApiProvider}. */
export interface ApiProviderProps {
  apis: ApiHolder;
  children: ReactNode;
}

/**
 * Provides a {@link ApiHolder} to the React tree so that descendants can read
 * utility APIs through {@link useApi}.
 */
export function ApiProvider(props: ApiProviderProps) {
  return (
    <ApiContext.Provider value={createVersionedValueMap({ 1: props.apis })}>
      {props.children}
    </ApiContext.Provider>
  );
}
