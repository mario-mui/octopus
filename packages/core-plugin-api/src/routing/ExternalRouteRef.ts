import { OpaqueExternalRouteRef } from '../internal';
import { describeParentCallSite } from './describeParentCallSite';
import { AnyRouteRefParams } from './types';

/**
 * Route descriptor, to be later bound to a concrete route by the app. Used to implement cross-plugin route references.
 *
 * @remarks
 *
 * See the upstream documentation.
 *
 * @public
 */
export interface ExternalRouteRef<
  TParams extends AnyRouteRefParams = AnyRouteRefParams,
> {
  readonly $$type: '@octopus/ExternalRouteRef';
  readonly T: TParams;
}

/** @internal */
export interface InternalExternalRouteRef<
  TParams extends AnyRouteRefParams = AnyRouteRefParams,
> extends ExternalRouteRef<TParams> {
  readonly version: 'v1';
  getParams(): string[];
  getDescription(): string;
  getDefaultTarget(): string | undefined;

  setId(id: string): void;
}

/** @internal */
export function toInternalExternalRouteRef<
  TParams extends AnyRouteRefParams = AnyRouteRefParams,
>(resource: ExternalRouteRef<TParams>): InternalExternalRouteRef<TParams> {
  const r = resource as InternalExternalRouteRef<TParams>;
  if (r.$$type !== '@octopus/ExternalRouteRef') {
    throw new Error(`Invalid ExternalRouteRef, bad type '${r.$$type}'`);
  }

  return r;
}

/**
 * Creates a route descriptor, to be later bound to a concrete route by the app. Used to implement cross-plugin route references.
 *
 * @remarks
 *
 * See the upstream documentation.
 *
 * @param options - Description of the route reference to be created.
 * @public
 */
export function createExternalRouteRef<
  TParams extends { [param in TParamKeys]: string } | undefined = undefined,
  TParamKeys extends string = string,
>(config?: {
  /**
   * The parameters that will be provided to the external route reference.
   */
  readonly params?: string extends TParamKeys
    ? (keyof TParams)[]
    : TParamKeys[];

  /**
   * The route (typically in another plugin) that this should map to by default.
   *
   * The string is expected to be on the standard `<plugin id>.<route id>` form,
   * for example `techdocs.docRoot`.
   */
  defaultTarget?: string;
}): ExternalRouteRef<
  keyof TParams extends never
    ? undefined
    : string extends TParamKeys
    ? TParams
    : { [param in TParamKeys]: string }
> {
  const params = (config?.params ?? []) as string[];
  const creationSite = describeParentCallSite();

  let id: string | undefined = undefined;

  return OpaqueExternalRouteRef.createInstance('v1', {
    T: undefined as unknown as TParams,
    getParams() {
      return params;
    },
    getDescription() {
      if (id) {
        return id;
      }
      return `created at '${creationSite}'`;
    },
    getDefaultTarget() {
      return config?.defaultTarget;
    },
    setId(newId: string) {
      if (!newId) {
        throw new Error(`ExternalRouteRef id must be a non-empty string`);
      }
      if (id && id !== newId) {
        throw new Error(
          `ExternalRouteRef was referenced twice as both '${id}' and '${newId}'`,
        );
      }
      id = newId;
    },
    toString(): string {
      return `externalRouteRef{id=${id},at='${creationSite}'}`;
    },
  });
}
