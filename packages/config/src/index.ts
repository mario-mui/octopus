/**
 * Config API used by Backstage core, backend, and CLI
 *
 * @packageDocumentation
 */

export type {
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
} from './deprecatedTypes';
export { readDurationFromConfig } from './readDurationFromConfig';
export { ConfigReader } from './reader';
export type { AppConfig, Config } from './types';
