/**
 * Common TypeScript types used within Backstage
 *
 * @packageDocumentation
 */

export { createDeferred, type DeferredPromise } from './deferred';
export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from './json';
export type { Observable, Observer, Subscription } from './observable';
export { type HumanDuration, durationToMilliseconds } from './time';
export { type Expand, type ExpandRecursive } from './expand';
