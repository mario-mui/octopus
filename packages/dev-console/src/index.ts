/**
 * Dev-only proxy that auto-logs into an Alauda console backend (dex) using
 * credentials from a local `.consolerc` file, so the app runs against real
 * backend data in development. Starts a standalone proxy server (like the
 * upstream console's dev console) and wires it into rsbuild via
 * {@link pluginDevConsole}.
 *
 * @packageDocumentation
 */
export { pluginDevConsole } from './plugin';
export type { DevConsolePluginOptions } from './plugin';
export { startDevConsole } from './proxy-server';
export { loadConsoleConfig } from './config';
export type { ConsoleConfig } from './config';
