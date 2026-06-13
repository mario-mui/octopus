/*
 * React context carrying the form-wide expression context + the injected
 * resource fetcher + locale. Hosts wrap their dynamic fields in a
 * `DynamicFormProvider` (e.g. the pipeline task drawer provides
 * `{ cluster, namespace, project, params }` and an auth-aware `fetchResource`).
 */
import { PropsWithChildren, createContext, useContext, useMemo } from 'react';
import { DynamicFormContextValue } from './types';

const DynamicFormContext = createContext<DynamicFormContextValue>({
  context: {},
});

export function DynamicFormProvider({
  context,
  fetchResource,
  locale,
  children,
}: PropsWithChildren<DynamicFormContextValue>) {
  const value = useMemo<DynamicFormContextValue>(
    () => ({ context, fetchResource, locale }),
    [context, fetchResource, locale],
  );
  return (
    <DynamicFormContext.Provider value={value}>
      {children}
    </DynamicFormContext.Provider>
  );
}

export function useDynamicFormContext(): DynamicFormContextValue {
  return useContext(DynamicFormContext);
}

/** The scope `${…}` expressions evaluate against (`context.*` + extras). */
export function buildScope(
  ctx: DynamicFormContextValue,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return { context: ctx.context, ...extra };
}
