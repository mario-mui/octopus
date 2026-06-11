import { useParams } from 'react-router-dom';
import { AnyRouteRefParams } from './types';
import { RouteRef } from './RouteRef';
import { SubRouteRef } from './SubRouteRef';

/**
 * React hook for retrieving dynamic params from the current URL.
 * @param _routeRef - Ref of the current route.
 * @public
 */
export function useRouteRefParams<Params extends AnyRouteRefParams>(
  _routeRef: RouteRef<Params> | SubRouteRef<Params>,
): Params {
  return useParams() as Params;
}
