import { ConfigApi } from '@octopus/core-plugin-api';

/** @internal */
export function getBasePath(configApi: ConfigApi) {
  let { pathname } = new URL(
    configApi.getOptionalString('app.baseUrl') ?? '/',
    'http://sample.dev', // baseUrl can be specified as just a path
  );
  pathname = pathname.replace(/\/*$/, '');
  return pathname;
}
