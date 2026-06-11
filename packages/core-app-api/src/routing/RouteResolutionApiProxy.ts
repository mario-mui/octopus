import {
  AnyRouteRefParams,
  ExternalRouteRef,
  RouteFunc,
  RouteRef,
  RouteResolutionApi,
  SubRouteRef,
} from '@octopus/core-plugin-api';
import { RouteResolver } from './RouteResolver';
import { RouteInfo } from './extractRouteInfoFromAppNode';

/**
 * Implements `routeResolutionApiRef`. It is registered in the DI container
 * *before* the app tree is instantiated (so `useRouteRef` can read it), but the
 * actual resolver is only built once route paths are known — i.e. after
 * instantiation, via {@link RouteResolutionApiProxy.initialize}.
 */
export class RouteResolutionApiProxy implements RouteResolutionApi {
  #delegate?: RouteResolver;

  constructor(
    private readonly routeBindings: Map<
      ExternalRouteRef,
      RouteRef | SubRouteRef
    >,
    private readonly appBasePath: string,
  ) {}

  resolve<TParams extends AnyRouteRefParams>(
    anyRouteRef:
      | RouteRef<TParams>
      | SubRouteRef<TParams>
      | ExternalRouteRef<TParams>,
    options?: { sourcePath?: string },
  ): RouteFunc<TParams> | undefined {
    if (!this.#delegate) {
      throw new Error(
        "Can't resolve routes during app tree initialization. Move route " +
          'resolution out of extension factories and into render/runtime code.',
      );
    }
    return this.#delegate.resolve(anyRouteRef, options);
  }

  initialize(
    routeInfo: RouteInfo,
    routeRefsById: Map<string, RouteRef | SubRouteRef>,
  ) {
    this.#delegate = new RouteResolver(
      routeInfo.routePaths,
      routeInfo.routeParents,
      routeInfo.routeObjects,
      this.routeBindings,
      this.appBasePath,
      routeInfo.routeAliasResolver,
      routeRefsById,
    );
  }
}
