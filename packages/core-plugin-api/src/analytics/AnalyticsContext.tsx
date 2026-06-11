import {
  createVersionedContext,
  createVersionedValueMap,
} from '@octopus/version-bridge';
import { ComponentType, ReactNode, useContext } from 'react';
import { AnalyticsContextValue } from './types';

const AnalyticsReactContext = createVersionedContext<{
  1: AnalyticsContextValue;
}>('analytics-context');

/**
 * A "private" (to this package) hook that enables context inheritance and a
 * way to read Analytics Context values at event capture-time.
 *
 * @internal
 */
export const useAnalyticsContext = (): AnalyticsContextValue => {
  const theContext = useContext(AnalyticsReactContext);

  // Provide a default value if no value exists.
  if (theContext === undefined) {
    return {
      pluginId: 'app',
      extensionId: 'app',
    };
  }

  // This should probably never happen, but check for it.
  const theValue = theContext.atVersion(1);
  if (theValue === undefined) {
    throw new Error('No context found for version 1.');
  }

  return theValue;
};

/**
 * Provides components in the child react tree an Analytics Context, ensuring
 * all analytics events captured within the context have relevant attributes.
 *
 * @remarks
 *
 * Analytics contexts are additive, meaning the context ultimately emitted with
 * an event is the combination of all contexts in the parent tree.
 *
 * @public
 */
export const AnalyticsContext = (options: {
  attributes: Partial<AnalyticsContextValue>;
  children: ReactNode;
}) => {
  const { attributes, children } = options;

  const parentValues = useAnalyticsContext();
  const combinedValue = {
    ...parentValues,
    ...attributes,
  };

  const versionedCombinedValue = createVersionedValueMap({ 1: combinedValue });
  return (
    <AnalyticsReactContext.Provider value={versionedCombinedValue}>
      {children}
    </AnalyticsReactContext.Provider>
  );
};

/**
 * Returns an HOC wrapping the provided component in an Analytics context with
 * the given values.
 *
 * @param Component - Component to be wrapped with analytics context attributes
 * @param values - Analytics context key/value pairs.
 * @internal
 */
export function withAnalyticsContext<TProps extends {}>(
  Component: ComponentType<TProps>,
  values: AnalyticsContextValue,
) {
  const ComponentWithAnalyticsContext = (props: TProps) => {
    return (
      <AnalyticsContext attributes={values}>
        <Component {...props} />
      </AnalyticsContext>
    );
  };
  ComponentWithAnalyticsContext.displayName = `WithAnalyticsContext(${
    Component.displayName || Component.name || 'Component'
  })`;
  return ComponentWithAnalyticsContext;
}
