import {
  AppNode,
  ExternalRouteRef,
  RouteRef,
  SubRouteRef,
} from '@octopus/core-plugin-api';

/** @internal */
export type AnyRouteRef = RouteRef | SubRouteRef | ExternalRouteRef;

/**
 * A duplicate of the react-router RouteObject, but with routeRef added
 * @internal
 */
export interface OctopusRouteObject {
  caseSensitive: boolean;
  children?: OctopusRouteObject[];
  element: React.ReactNode;
  path: string;
  routeRefs: Set<RouteRef>;
  appNode?: AppNode;
}
