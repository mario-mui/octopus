// Temporarily re-export the JSON types from @octopus/types
import type {
  JsonArray as CoreJsonArray,
  JsonObject as CoreJsonObject,
  JsonPrimitive as CoreJsonPrimitive,
  JsonValue as CoreJsonValue,
} from '@octopus/types';

/**
 * A type representing all allowed JSON primitive values.
 *
 * @public
 * @deprecated Please use the same type from `@octopus/types` instead
 */
export type JsonPrimitive = CoreJsonPrimitive;

/**
 * A type representing all allowed JSON object values.
 *
 * @public
 * @deprecated Please use the same type from `@octopus/types` instead
 */
export type JsonObject = CoreJsonObject;

/**
 * A type representing all allowed JSON array values.
 *
 * @public
 * @deprecated Please use the same type from `@octopus/types` instead
 */
export type JsonArray = CoreJsonArray;

/**
 * A type representing all allowed JSON values.
 *
 * @public
 * @deprecated Please use the same type from `@octopus/types` instead
 */
export type JsonValue = CoreJsonValue;
