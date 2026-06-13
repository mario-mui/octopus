/*
 * Graph build orchestrator — the framework-agnostic equivalent of the Angular
 * `PipelineTopologicalLayoutComponent` effect: from a list of pipeline node
 * models (already including any empty placeholders and group nodes), detect
 * cycles, lay out the acyclic remainder topologically, derive edges, wrap any
 * cyclic nodes in an error group, and run the dagre layout.
 */
import {
  DEFAULT_FINALLY_NODE_TYPE,
  DEFAULT_GROUP_TYPE,
  Direction,
  ERROR_STATE,
} from './constants';
import { LayoutOptions, runDagreLayout } from './dagre-layout';
import { findCycles, getEdgesFromNodes, getTopologicalNodes } from './graph-utils';
import { uniq } from './internal/util';
import { LayoutModel, PipelineNodeModel, PositionedGraph } from './model';

export interface BuildGraphOptions extends LayoutOptions {
  mode?: LayoutModel;
  finallyNodeTypes?: string[];
}

export interface BuildGraphResult extends PositionedGraph {
  /** ids of nodes participating in a dependency cycle (rendered as errors). */
  cycleNodeIds: string[];
}

export function buildGraph(
  pipelineNodes: PipelineNodeModel[],
  options: BuildGraphOptions = {},
): BuildGraphResult {
  const mode = options.mode ?? LayoutModel.Normal;
  const finallyNodeTypes = options.finallyNodeTypes ?? [
    DEFAULT_FINALLY_NODE_TYPE,
  ];

  const cycles = findCycles<PipelineNodeModel>(pipelineNodes, node => node.id);
  const cycleNodeIds = uniq(cycles.flat());

  const unCycles = pipelineNodes.filter(node =>
    cycles.every(cycle => !cycle.includes(node.id)),
  );

  const nodes = getTopologicalNodes(unCycles, mode, finallyNodeTypes) || [];
  const edges = getEdgesFromNodes(nodes, mode);

  const cycleNodes: PipelineNodeModel[] = cycles?.length
    ? [
        ...cycleNodeIds
          .map(id => pipelineNodes.find(node => node.id === id))
          .filter((n): n is PipelineNodeModel => !!n),
        {
          group: true,
          id: 'error-cycle-group',
          type: DEFAULT_GROUP_TYPE,
          children: cycleNodeIds,
          state: { [ERROR_STATE]: true },
          style: { padding: 18 },
        },
      ]
    : [];

  const layout = runDagreLayout([...cycleNodes, ...nodes], edges, {
    direction: options.direction ?? Direction.LEFT_TO_RIGHT,
    graphPadding: options.graphPadding,
  });

  return { ...layout, cycleNodeIds };
}
