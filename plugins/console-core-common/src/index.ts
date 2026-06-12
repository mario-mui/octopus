/*
 * Shared constants and utilities for the console-style packages.
 *
 * @packageDocumentation
 */

export { API_GATEWAY } from './constants';
export {
  CONSOLE_VIEWS,
  getView,
  viewRoutePattern,
  viewPath,
} from './views';
export type { ViewId, ConsoleView } from './views';
export * from './types';
export * from './k8s';
