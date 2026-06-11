import { JsonObject } from '@octopus/types';
import {
  ApiBlueprint,
  ApiHolder,
  ApiProvider,
  AppTree,
  FrontendFeature,
  coreExtensionData,
  resolveExtensionDefinition,
  routeResolutionApiRef,
} from '@octopus/core-plugin-api';
import { ConfigReader } from '@octopus/config';
import { createErrorCollector } from './wiring/createErrorCollector';
import {
  FrontendApiRegistry,
  FrontendApiResolver,
} from './wiring/FrontendApiRegistry';
import { resolveAppNodeSpecs } from './tree/resolveAppNodeSpecs';
import { resolveAppTree } from './tree/resolveAppTree';
import { instantiateAppNodeTree } from './tree/instantiateAppNodeTree';
import { Root } from './coreExtensions';
import { createBuiltinApiFactories } from './builtinApis';
import { collectRouteIds } from './routing/collectRouteIds';
import {
  resolveRouteBindings,
  CreateAppRouteBinder,
} from './routing/resolveRouteBindings';
import { extractRouteInfoFromAppNode } from './routing/extractRouteInfoFromAppNode';
import { createRouteAliasResolver } from './routing/RouteAliasResolver';
import { RouteResolutionApiProxy } from './routing/RouteResolutionApiProxy';

/** A wiring error surfaced while building the app tree. */
export interface AppWiringError {
  code: string;
  message: string;
}

/** Options for {@link createApp}. */
export interface CreateAppOptions {
  /** Static plugins/modules, and features loaded via Module Federation. */
  features?: FrontendFeature[];
  /**
   * Static app configuration, exposed to extensions through `configApiRef`.
   * No backend required — this is read directly by a `ConfigReader`.
   */
  config?: JsonObject;
  /**
   * Binds plugins' external route refs to concrete route refs, so plugins can
   * link to each other without hard-coding paths or importing one another.
   */
  bindRoutes?: (context: { bind: CreateAppRouteBinder }) => void;
}

/** The result of wiring an Octopus app. */
export interface OctopusApp {
  /** The fully resolved and instantiated extension tree. */
  readonly tree: AppTree;
  /** The dependency-injection container of utility APIs. */
  readonly apis: ApiHolder;
  /** Non-fatal/fatal wiring errors collected while building the tree. */
  readonly errors: AppWiringError[];
  /**
   * The React root element produced by the tree's `app` input, wrapped in an
   * {@link ApiProvider} so descendants can read utility APIs via `useApi`.
   */
  getRootElement(): JSX.Element | undefined;
}

/**
 * Collects a set of frontend features (plugins/modules) into an instantiated
 * extension tree, with a utility-API dependency-injection container.
 *
 * This is the lean Octopus composition root. It reproduces Octopus's tree
 * pipeline — `resolveAppNodeSpecs` → `resolveAppTree` → `instantiateAppNodeTree`
 * — without the legacy compatibility layer, app-config loading, route bindings,
 * or Material UI defaults.
 */
export function createApp(options: CreateAppOptions = {}): OctopusApp {
  const collector = createErrorCollector();
  const features = options.features ?? [];
  const config = new ConfigReader(options.config ?? {}, 'octopus-app-config');

  const tree = resolveAppTree(
    'root',
    resolveAppNodeSpecs({
      features,
      builtinExtensions: [resolveExtensionDefinition(Root, { namespace: 'root' })],
      parameters: [],
      forbidden: new Set(['root']),
      collector,
    }),
    collector,
  );

  // Decoupled routing: collect every plugin's route refs, resolve external →
  // concrete bindings, and register a route-resolution proxy now so `useRouteRef`
  // can read it. The real resolver is built after instantiation (below), once
  // route paths are known.
  const routeRefsById = collectRouteIds(features, collector);
  const routeBindings = resolveRouteBindings(
    options.bindRoutes,
    config,
    routeRefsById,
    collector,
  );
  const routeResolutionApi = new RouteResolutionApiProxy(routeBindings, '');

  // Builtin utility APIs (config, fetch, route resolution) are fallbacks a
  // plugin can override.
  const defaults = new FrontendApiRegistry();
  defaults.registerAll(createBuiltinApiFactories(config));
  defaults.register({
    api: routeResolutionApiRef,
    deps: {},
    factory: () => routeResolutionApi,
  });

  // The resolver is lazy — it only builds an API when `get` is first called
  // (at render time, via ApiProvider/useApi). We hand it to instantiation up
  // front, then populate its registry from the instantiated `apis` extensions.
  const registry = new FrontendApiRegistry();
  const apis = new FrontendApiResolver({
    primaryRegistry: registry,
    secondaryRegistry: defaults,
  });

  instantiateAppNodeTree(tree.root, apis, collector);

  for (const node of tree.root.edges.attachments.get('apis') ?? []) {
    const factory = node.instance?.getData(ApiBlueprint.dataRefs.factory);
    if (factory) {
      registry.register(factory);
    }
  }

  // Route paths are now known — build the concrete resolver.
  routeResolutionApi.initialize(
    extractRouteInfoFromAppNode(
      tree.root,
      createRouteAliasResolver(routeRefsById),
    ),
    routeRefsById.routes,
  );

  const errors: AppWiringError[] = (collector.collectErrors() ?? []).map(e => ({
    code: e.code,
    message: e.message,
  }));

  return {
    tree,
    apis,
    errors,
    getRootElement() {
      const element = tree.root.instance?.getData(coreExtensionData.reactElement);
      if (!element) {
        return undefined;
      }
      return <ApiProvider apis={apis}>{element}</ApiProvider>;
    },
  };
}
