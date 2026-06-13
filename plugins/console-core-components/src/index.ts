/*
 * Console-style core components for Octopus, grouped by feature:
 *
 *  - `resource-selector/` — the view resource selectors (project / cluster) and
 *    their list providers, for the top of the sidebar;
 *  - `cluster-namespace-selector/` — the combined cluster + namespace header
 *    selector;
 *  - `foldable-block/` — a labelled, collapsible content block;
 *  - `array-form-table/` — a table-driven editor for a list of rows;
 *  - `utils/` — shared helpers, e.g. workspace (cluster + namespace) routing.
 *
 * @packageDocumentation
 */

export * from './resource-selector';
export * from './cluster-namespace-selector';
export * from './foldable-block';
export * from './array-form-table';
export * from './utils';
