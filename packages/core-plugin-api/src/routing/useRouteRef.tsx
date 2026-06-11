import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AnyRouteRefParams } from './types';
import { RouteRef } from './RouteRef';
import { SubRouteRef } from './SubRouteRef';
import { ExternalRouteRef } from './ExternalRouteRef';
import { RouteFunc, routeResolutionApiRef, useApi } from '../apis';

/**
 * React hook for constructing URLs to routes.
 *
 * @remarks
 *
 * See the upstream documentation
 *
 * @param routeRef - The ref to route that should be converted to URL.
 * @returns A function that will in turn return the concrete URL of the `routeRef`, or `undefined` if the route is not available.
 * @public
 */
export function useRouteRef<TParams extends AnyRouteRefParams>(
  routeRef:
    | RouteRef<TParams>
    | SubRouteRef<TParams>
    | ExternalRouteRef<TParams>,
): RouteFunc<TParams> | undefined {
  const { pathname } = useLocation();
  const routeResolutionApi = useApi(routeResolutionApiRef);

  const routeFunc = useMemo(
    () => routeResolutionApi.resolve(routeRef, { sourcePath: pathname }),
    [routeResolutionApi, routeRef, pathname],
  );

  return routeFunc;
}
