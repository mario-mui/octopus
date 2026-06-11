import { RouteRef } from '@octopus/core-plugin-api';
import { RouteRefsById } from './collectRouteIds';
import { OpaqueRouteRef } from '@octopus/core-plugin-api';

/**
 * @internal
 */
export type RouteAliasResolver = {
  (routeRef: RouteRef, pluginId?: string): RouteRef;
  (routeRef?: RouteRef, pluginId?: string): RouteRef | undefined;
};

/**
 * Creates a route alias resolver that resolves aliases based on the route IDs
 * @internal
 */
export function createRouteAliasResolver(
  routeRefsById: RouteRefsById,
): RouteAliasResolver {
  const resolver = (routeRef: RouteRef | undefined, pluginId?: string) => {
    if (!routeRef) {
      return undefined;
    }

    let currentRef = routeRef;
    for (let i = 0; i < 100; i++) {
      const alias = OpaqueRouteRef.toInternal(currentRef).alias;
      if (alias) {
        if (pluginId) {
          const [aliasPluginId] = alias.split('.');
          if (aliasPluginId !== pluginId) {
            throw new Error(
              `Refused to resolve alias '${alias}' for ${currentRef} as it points to a different plugin, the expected plugin is '${pluginId}' but the alias points to '${aliasPluginId}'`,
            );
          }
        }
        const aliasRef = routeRefsById.routes.get(alias);
        if (!aliasRef) {
          throw new Error(
            `Unable to resolve RouteRef alias '${alias}' for ${currentRef}`,
          );
        }
        if (aliasRef.$$type === '@octopus/SubRouteRef') {
          throw new Error(
            `RouteRef alias '${alias}' for ${currentRef} points to a SubRouteRef, which is not supported`,
          );
        }
        currentRef = aliasRef;
      } else {
        return currentRef;
      }
    }
    throw new Error(`Alias loop detected for ${routeRef}`);
  };

  return resolver as RouteAliasResolver;
}

/**
 * Creates a route alias resolver that resolves aliases based on a map of route refs to their aliases
 * @internal
 */
export function createExactRouteAliasResolver(
  routeAliases: Map<RouteRef, RouteRef | undefined>,
): RouteAliasResolver {
  const resolver = (routeRef?: RouteRef) => {
    if (routeRef && routeAliases.has(routeRef)) {
      return routeAliases.get(routeRef);
    }
    return routeRef;
  };
  return resolver as RouteAliasResolver;
}
