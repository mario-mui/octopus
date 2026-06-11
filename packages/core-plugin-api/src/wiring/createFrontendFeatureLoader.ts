import { ConfigApi } from '../apis/definitions';
import { describeParentCallSite } from '../routing/describeParentCallSite';
import { FrontendFeature } from './types';

/** @public */
export interface CreateFrontendFeatureLoaderOptions {
  loader(deps: {
    config: ConfigApi;
  }):
    | Iterable<
        | FrontendFeature
        | FrontendFeatureLoader
        | Promise<{ default: FrontendFeature | FrontendFeatureLoader }>
      >
    | Promise<
        Iterable<
          | FrontendFeature
          | FrontendFeatureLoader
          | Promise<{ default: FrontendFeature | FrontendFeatureLoader }>
        >
      >
    | AsyncIterable<
        | FrontendFeature
        | FrontendFeatureLoader
        | { default: FrontendFeature | FrontendFeatureLoader }
      >;
}

/** @public */
export interface FrontendFeatureLoader {
  readonly $$type: '@octopus/FrontendFeatureLoader';
}

/** @internal */
export interface InternalFrontendFeatureLoader extends FrontendFeatureLoader {
  readonly version: 'v1';
  readonly description: string;
  readonly loader: (deps: {
    config: ConfigApi;
  }) => Promise<(FrontendFeature | FrontendFeatureLoader)[]>;
}

/** @public */
export function createFrontendFeatureLoader(
  options: CreateFrontendFeatureLoaderOptions,
): FrontendFeatureLoader {
  const description = `created at '${describeParentCallSite()}'`;
  return {
    $$type: '@octopus/FrontendFeatureLoader',
    version: 'v1',
    description,
    toString() {
      return `FeatureLoader{description=${description}}`;
    },
    async loader(deps: {
      config: ConfigApi;
    }): Promise<(FrontendFeature | FrontendFeatureLoader)[]> {
      const it = await options.loader(deps);
      const result = new Array<FrontendFeature | FrontendFeatureLoader>();
      for await (const item of it) {
        if (isFeatureOrLoader(item)) {
          result.push(item);
        } else if ('default' in item) {
          result.push(item.default);
        } else {
          throw new Error(`Invalid item "${item}"`);
        }
      }
      return result;
    },
  } as InternalFrontendFeatureLoader;
}

/** @internal */
export function isInternalFrontendFeatureLoader(opaque: {
  $$type: string;
}): opaque is InternalFrontendFeatureLoader {
  if (opaque.$$type === '@octopus/FrontendFeatureLoader') {
    // Make sure we throw if invalid
    toInternalFrontendFeatureLoader(opaque as FrontendFeatureLoader);
    return true;
  }
  return false;
}

/** @internal */
export function toInternalFrontendFeatureLoader(
  plugin: FrontendFeatureLoader,
): InternalFrontendFeatureLoader {
  const internal = plugin as InternalFrontendFeatureLoader;
  if (internal.$$type !== '@octopus/FrontendFeatureLoader') {
    throw new Error(`Invalid plugin instance, bad type '${internal.$$type}'`);
  }
  if (internal.version !== 'v1') {
    throw new Error(
      `Invalid plugin instance, bad version '${internal.version}'`,
    );
  }
  return internal;
}

function isFeatureOrLoader(
  obj: unknown,
): obj is FrontendFeature | FrontendFeatureLoader {
  if (obj !== null && typeof obj === 'object' && '$$type' in obj) {
    return (
      obj.$$type === '@octopus/FrontendPlugin' ||
      obj.$$type === '@octopus/FrontendModule' ||
      obj.$$type === '@octopus/FrontendFeatureLoader'
    );
  }
  return false;
}
