/*
 * Topology model types. Extracted from the console `@topology` lib (`types.ts`,
 * `layouts/types.ts`) — the framework-agnostic data shapes used to describe a
 * graph as input, and the positioned result produced after layout.
 */
import { Padding, PointIface } from './geom';

export type State = Record<string, boolean>;

export enum ModelKind {
  graph = 'graph',
  node = 'node',
  edge = 'edge',
}

export enum LayoutModel {
  Comprehensive,
  Normal,
  Concise,
}

export interface ElementModel {
  id: string;
  type: string;
  label?: string;
  visible?: boolean;
  children?: string[];
  data?: unknown;
  style?: { padding?: Padding; [key: string]: unknown };
  state?: State;
}

export interface GraphModel extends ElementModel {
  layout?: string;
  x?: number;
  y?: number;
  scale?: number;
}

export interface NodeModel extends ElementModel {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  group?: boolean;
  groupStyle?: { [key: string]: unknown };
  collapsed?: boolean;
}

/** A task/finally node carrying its dependency edges. */
export type PipelineNodeModel = NodeModel & {
  runAfter?: string[];
  resultAfter?: string[];
};

export interface EdgeModel extends ElementModel {
  source?: string;
  target?: string;
}

export interface Model {
  graph?: GraphModel;
  nodes?: NodeModel[];
  edges?: EdgeModel[];
}

/* ---- Positioned output (after running the layout) ---- */

export interface PositionedNode extends PipelineNodeModel {
  /** centre x in graph coordinates */
  x: number;
  /** centre y in graph coordinates */
  y: number;
  width: number;
  height: number;
}

export interface PositionedEdge extends EdgeModel {
  points: PointIface[];
}

export interface PositionedGraph {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  /** overall content bounds */
  width: number;
  height: number;
}
