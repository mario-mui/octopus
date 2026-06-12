/*
 * @octopus/topology — a reusable React DAG/relationship topology engine.
 *
 * Ported from the console's Angular `@topology` library: the framework-agnostic
 * graph engine (geometry, topological sort, transitive reduction, spacer
 * insertion, cycle detection, dagre layout, edge routing) plus a generic React
 * <Topology> renderer with a pluggable node-component registry. Build pipeline
 * orchestration views or any other relationship graph on top of it.
 */
export * from './geom';
export * from './constants';
export * from './model';
export * from './graph-utils';
export { runDagreLayout } from './dagre-layout';
export type { LayoutOptions } from './dagre-layout';
export { buildGraph } from './buildGraph';
export type { BuildGraphOptions, BuildGraphResult } from './buildGraph';
export { getStraightPath, getBezierCurvePath } from './edge-path';
export { Topology } from './react/Topology';
export type {
  TopologyProps,
  NodeComponents,
  NodeRenderProps,
} from './react/Topology';
