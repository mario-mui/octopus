/*
 * Pure graph algorithms ported from the console `@topology` lib
 * (`utils/layout-utils.ts`): topological sort, transitive reduction, spacer-node
 * insertion, finally-group wiring, edge derivation and cycle detection.
 *
 * These are the bespoke, correctness-critical pieces of the pipeline layout and
 * are reproduced as faithfully as possible. Only the lodash calls were swapped
 * for the dependency-free equivalents in `./internal/util`.
 */
import {
  DEFAULT_EDGE_TYPE,
  DEFAULT_FINALLY_GROUP_TYPE,
  DEFAULT_FINALLY_NODE_TYPE,
  DEFAULT_RESULT_EDGE_TYPE,
  DEFAULT_SPACER_NODE_TYPE,
  DEFAULT_UNNECESSARY_EDGE_TYPE,
} from './constants';
import { cloneDeep, isEqual, uniqWith } from './internal/util';
import { EdgeModel, LayoutModel, PipelineNodeModel } from './model';

const ID_CONNECTOR = '|';
const getSpacerId = (ids: string[]): string =>
  [...ids]
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, ref) => (acc ? `${acc}${ID_CONNECTOR}${ref}` : ref), '');

const genEdgeID = (...names: string[]) => names.join('(->)');

const nodeVisible = (
  node: PipelineNodeModel,
  nodes: PipelineNodeModel[],
): boolean => {
  const parentNode = nodes.find(n => n.children?.includes(node.id));
  if (!parentNode) {
    return true;
  }
  if (parentNode.collapsed) {
    return false;
  }
  return nodeVisible(parentNode, nodes);
};

function getAfter(node: { runAfter?: string[]; resultAfter?: string[] }) {
  return Array.from(
    new Set([...(node?.runAfter || []), ...(node?.resultAfter || [])]),
  );
}

/**
 * Returns all nodes, including the spacer nodes required to lay out the pipeline
 * view (parallel-to-parallel spacers and the finally-group spacer).
 */
export const getTopologicalNodes = (
  nodes: PipelineNodeModel[],
  layoutModel = LayoutModel.Normal,
  finallyNodeTypes: string[] = [DEFAULT_FINALLY_NODE_TYPE],
  finallyGroupTypes: string[] = [DEFAULT_FINALLY_GROUP_TYPE],
  spacerNodeType = DEFAULT_SPACER_NODE_TYPE,
  group = false,
): PipelineNodeModel[] => {
  interface ParallelNodeMap {
    [id: string]: PipelineNodeModel[];
  }

  nodes = reductionNodeRelation(nodes, layoutModel, finallyNodeTypes) || [];

  const visibleNodes = nodes.filter(n => nodeVisible(n, nodes));

  const lastTasks = visibleNodes
    .filter(n => !finallyNodeTypes.includes(n.type))
    .filter(t => !nodes.find(n => getAfter(n)?.includes(t.id)) && !t.group);

  // Collect only multiple run-afters
  const multipleRunAfterMap: ParallelNodeMap = nodes.reduce((acc, node) => {
    const totalAfter = getAfter(node);
    if (totalAfter && totalAfter.length > 1) {
      const id: string = getSpacerId(totalAfter);
      if (!Array.isArray(acc[id])) {
        acc[id] = [];
      }
      acc[id].push(node);
    }
    return acc;
  }, {} as ParallelNodeMap);

  // Trim out single occurrences
  const multiParallelToParallelList: ParallelNodeMap = Object.keys(
    multipleRunAfterMap,
  ).reduce((acc, key) => {
    if (multipleRunAfterMap[key].length > 1) {
      acc[key] = multipleRunAfterMap[key];
    }
    return acc;
  }, {} as ParallelNodeMap);

  const spacerNodes: PipelineNodeModel[] = [];

  // Insert a spacer node between the multiple nodes on the sides of a parallel-to-parallel
  Object.entries(multiParallelToParallelList).forEach(([key, group]) => {
    spacerNodes.push({
      id: key,
      type: spacerNodeType,
      width: 1,
      height: 1,
      runAfter: group[0].runAfter,
      resultAfter: group.every(node =>
        isEqual(node.resultAfter, group[0].resultAfter),
      )
        ? group[0].resultAfter
        : [],
    });

    group.forEach(node => {
      if (node.runAfter?.length) {
        node.runAfter = [key];
        node.resultAfter = [];
      } else {
        node.resultAfter = [key];
      }
    });
  });

  if (group) {
    const finallyGroups = visibleNodes.filter(n =>
      finallyGroupTypes.includes(n.type),
    );
    if (lastTasks?.length > 1 && finallyGroups?.length) {
      const finallyGroupId =
        getSpacerId(lastTasks.map(task => task.id)) + '(finally-group)';
      spacerNodes.push({
        id: finallyGroupId,
        type: spacerNodeType,
        width: 1,
        height: 1,
        runAfter: lastTasks.map(task => task.id),
      });
      finallyGroups.forEach(node => {
        node.runAfter = [finallyGroupId];
      });
    } else {
      finallyGroups.forEach(
        g => (g.runAfter = lastTasks.map(task => task.id)),
      );
    }
  } else {
    const finallyNodes = visibleNodes.filter(n =>
      finallyNodeTypes.includes(n.type),
    );
    if (finallyNodes?.length) {
      const finallyGroupId =
        getSpacerId(finallyNodes.map(n => n.id)) + '(finally-group)';

      if (lastTasks?.length > 1) {
        spacerNodes.push({
          id: finallyGroupId,
          type: spacerNodeType,
          width: 1,
          height: 1,
          runAfter: lastTasks.map(task => task.id),
        });
        finallyNodes.forEach(node => {
          node.runAfter = [finallyGroupId];
        });
      } else {
        finallyNodes.forEach(node => {
          node.runAfter = lastTasks.map(task => task.id);
        });
      }
    }
  }

  return [...nodes, ...spacerNodes];
};

export const getEdgesFromNodes = (
  nodes: PipelineNodeModel[],
  layoutModel = LayoutModel.Normal,
  edgeType = DEFAULT_EDGE_TYPE,
  resultEdgeType = DEFAULT_RESULT_EDGE_TYPE,
  unnecessaryEdgeType = DEFAULT_UNNECESSARY_EDGE_TYPE,
): EdgeModel[] => {
  const edges: EdgeModel[] = [];
  const visibleNodes = nodes.filter(n => nodeVisible(n, nodes));

  visibleNodes.forEach(node => {
    node.runAfter?.forEach(afterId => {
      if (nodes.some(n => n.id === afterId)) {
        edges.push({
          id: genEdgeID(afterId, node.id),
          type: edgeType,
          source: afterId,
          target: node.id,
        });
      }
    });
    node.resultAfter
      ?.filter(r => nodes.some(n => n.id === r))
      ?.filter(r => !node.runAfter?.includes(r))
      ?.forEach(afterId => {
        edges.push({
          id: genEdgeID(afterId, node.id),
          type: resultEdgeType,
          source: afterId,
          target: node.id,
        });
      });
  });

  const reductionEdges = transitiveReductionEdges(nodes, node => node.id);
  return edges.map(edge => {
    if (
      layoutModel !== LayoutModel.Concise &&
      edge.type === edgeType &&
      !reductionEdges.some(re => genEdgeID(re.from, re.to) === edge.id)
    ) {
      edge.type = unnecessaryEdgeType;
    }
    return edge;
  });
};

/** Kahn's algorithm topological sort. */
export function topologicalSort<
  T = { runAfter?: string[]; resultAfter?: string[] },
>(nodes: T[], getName: (node: T) => string) {
  const nodeWm = new WeakMap<object, T>();
  const sortHelper = nodes.map(n => {
    const after = getAfter(n as { runAfter?: string[]; resultAfter?: string[] });
    const helper = { id: getName(n), after, in: after.length };
    nodeWm.set(helper, n);
    return helper;
  });

  const sorted: T[] = [];
  const queue: Array<{ id: string; after: string[]; in: number }> = [];

  sortHelper.forEach(n => {
    if (!n.in) {
      queue.push(n);
    }
  });

  while (queue.length) {
    const helper = queue.shift()!;
    sorted.push(nodeWm.get(helper)!);
    sortHelper.forEach(n => {
      if (n.after?.includes(helper.id)) {
        n.in--;
        if (!n.in) {
          queue.push(n);
        }
      }
    });
  }
  return sorted;
}

export function reductionNodeRelation(
  nodes: PipelineNodeModel[],
  layoutModel: LayoutModel,
  finallyNodeTypes: string[],
): PipelineNodeModel[] {
  const reductionEdges = transitiveReductionEdges(nodes, node => node.id);
  return nodes?.map(node => {
    if (finallyNodeTypes.includes(node.type)) {
      const resultAfter =
        layoutModel === LayoutModel.Comprehensive ? node.resultAfter : [];
      return { ...node, resultAfter };
    }
    const reductionNodeRelations = reductionEdges
      ?.filter(edge => edge.to === node.id)
      ?.map(edge => edge.from);

    let resultAfter: string[] = node.resultAfter || [];
    let runAfter: string[] = node.runAfter || [];

    if (layoutModel === LayoutModel.Concise) {
      resultAfter = resultAfter.filter(r => reductionNodeRelations.includes(r));
      runAfter = runAfter.filter(r => reductionNodeRelations.includes(r));
    }
    if (layoutModel === LayoutModel.Normal) {
      resultAfter = resultAfter.filter(r => reductionNodeRelations.includes(r));
    }
    return {
      ...node,
      resultAfter: resultAfter.filter(after =>
        nodes.some(n => n.id === after),
      ),
      runAfter: runAfter.filter(after => nodes.some(n => n.id === after)),
    };
  });
}

const transitiveReductionCache = new Map<
  string,
  Array<{ from: string; to: string }>
>();

/**
 * Transitive reduction of the dependency graph: keep the same reachability with
 * the fewest edges (drop a direct edge when an indirect path exists). Memoized
 * on the (runAfter, resultAfter) signature of the node set.
 */
export function transitiveReductionEdges<
  T extends { runAfter?: string[]; resultAfter?: string[] },
>(nodes: T[], getName: (node: T) => string): Array<{ from: string; to: string }> {
  if (!nodes?.length) {
    return [];
  }
  const cacheKey = nodes
    .map(node => `${node.runAfter?.join('~')}&${node.resultAfter?.join('~')}`)
    .join(',');
  const cached = transitiveReductionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  nodes = topologicalSort(nodes, getName);

  const res: Array<{ from: string; to: string }> = [];

  const { length } = nodes;
  const dp = Array.from({ length }, (_, i) =>
    Array.from({ length: i }).fill(false),
  ) as boolean[][];

  for (let i = 1; i < length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      resolve(i, j);
    }
  }

  function resolve(i: number, j: number) {
    const to = nodes[i];
    const from = nodes[j];
    if (!dp[i][j] && getAfter(to)?.includes(getName(from))) {
      res.push({ from: getName(from), to: getName(to) });
      mark(i, j);
    }
  }

  function mark(i: number, j: number) {
    dp[i][j] = true;
    for (let n = 0; n < j; n++) {
      dp[i][n] = dp[i][n] || dp[j][n];
    }
  }

  transitiveReductionCache.set(cacheKey, res);
  return res;
}

export function findCycles<
  T extends { runAfter?: string[]; resultAfter?: string[] },
>(nodes: T[], getId: (node: T) => string): string[][] {
  if (!nodes?.length) {
    return [];
  }
  return uniqWith(
    nodes.map(n => _findCycles<T>(n, nodes, getId)).flat(),
    isEqual,
  );
}

function _findCycles<
  T extends { runAfter?: string[]; resultAfter?: string[] },
>(
  node: T,
  nodes: T[],
  getId: (node: T) => string,
  visited = new Set<string>(),
  stack: string[] = [],
): string[][] {
  const cycles: string[][] = [];

  visited.add(getId(node));
  stack.push(getId(node));

  getAfter(node).forEach(n => {
    const next = nodes.find(g => getId(g) === n);
    if (next) {
      if (stack.includes(getId(next))) {
        const index = stack.indexOf(getId(next));
        const res = cloneDeep(stack)
          .slice(index)
          .sort((a, b) => a.localeCompare(b));
        cycles.push(res);
      } else if (!visited.has(getId(next))) {
        cycles.push(..._findCycles(next, nodes, getId, visited, stack));
      }
    }
  });

  stack.pop();

  return cycles;
}
