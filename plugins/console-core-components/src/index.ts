/*
 * Console-style core components for Octopus, grouped by feature:
 *
 *  - `resource-selector/` — the view resource selectors (project / cluster) and
 *    their list providers, for the top of the sidebar;
 *  - `cluster-namespace-selector/` — the combined cluster + namespace header
 *    selector;
 *  - `utils/` — shared helpers, e.g. workspace (cluster + namespace) routing.
 *
 * @packageDocumentation
 */

export * from './resource-selector';
export * from './cluster-namespace-selector';
export * from './utils';
