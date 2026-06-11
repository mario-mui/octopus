import { ExtensionDefinition } from './createExtension';
import {
  Extension,
  resolveExtensionDefinitions,
} from './resolveExtensionDefinition';
import { FeatureFlagConfig } from './types';
import { FilterPredicate } from '@octopus/filter-predicates';

/** @public */
export interface CreateFrontendModuleOptions<
  TPluginId extends string,
  TExtensions extends readonly ExtensionDefinition[],
> {
  pluginId: TPluginId;
  extensions?: TExtensions;
  featureFlags?: FeatureFlagConfig[];
  if?: FilterPredicate;
}

/** @public */
export interface FrontendModule {
  readonly $$type: '@octopus/FrontendModule';
  readonly pluginId: string;
}

/** @internal */
export interface InternalFrontendModule extends FrontendModule {
  readonly version: 'v1';
  readonly extensions: Extension<unknown>[];
  readonly featureFlags: FeatureFlagConfig[];
  readonly if?: FilterPredicate;
}

/**
 * Creates a new module that can be installed in an Octopus app.
 *
 * @remarks
 *
 * Modules are used to add or override extensions for an existing plugin. If a
 * module provides an extension with the same ID as one provided by the plugin,
 * the extension provided by the module will always take precedence.
 *
 * Every module is created for a specific plugin by providing the
 * unique ID of the plugin that the module should be installed for. If that
 * plugin is not present in the app, the module will be ignored and have no
 * effect.
 *
 * For more information on how modules work, see the
 * documentation for modules
 * in the frontend system documentation.
 *
 * It is recommended to name the module variable of the form `<pluginId>Module<ModuleName>`.
 *
 * @example
 *
 * ```tsx
 * import { createFrontendModule } from '@octopus/core-plugin-api';
 *
 * export const exampleModuleCustomPage = createFrontendModule({
 *   pluginId: 'example',
 *   extensions: [
 *     // Overrides the default page for the 'example' plugin
 *     PageBlueprint.make({
 *       path: '/example',
 *       loader: () => import('./CustomPage').then(m => <m.CustomPage />),
 *     }),
 *   ],
 * });
 * ```
 *
 * @public
 */
export function createFrontendModule<
  TId extends string,
  TExtensions extends readonly ExtensionDefinition[],
>(options: CreateFrontendModuleOptions<TId, TExtensions>): FrontendModule {
  const { pluginId } = options;

  const { extensions } = resolveExtensionDefinitions(options.extensions ?? [], {
    namespace: pluginId,
    featureType: 'Module',
  });

  return {
    $$type: '@octopus/FrontendModule',
    version: 'v1',
    pluginId,
    featureFlags: options.featureFlags ?? [],
    if: options.if,
    extensions,
    toString() {
      return `Module{pluginId=${pluginId}}`;
    },
  } as InternalFrontendModule;
}

/** @internal */
export function isInternalFrontendModule(opaque: {
  $$type: string;
}): opaque is InternalFrontendModule {
  if (opaque.$$type === '@octopus/FrontendModule') {
    // Make sure we throw if invalid
    toInternalFrontendModule(opaque as FrontendModule);
    return true;
  }
  return false;
}

/** @internal */
export function toInternalFrontendModule(
  plugin: FrontendModule,
): InternalFrontendModule {
  const internal = plugin as InternalFrontendModule;
  if (internal.$$type !== '@octopus/FrontendModule') {
    throw new Error(`Invalid plugin instance, bad type '${internal.$$type}'`);
  }
  if (internal.version !== 'v1') {
    throw new Error(
      `Invalid plugin instance, bad version '${internal.version}'`,
    );
  }
  return internal;
}
