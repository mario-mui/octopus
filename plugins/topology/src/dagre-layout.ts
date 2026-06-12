/*
 * Dagre layout runner. Reproduces the behaviour of the console `@topology`
 * lib's `DagreLayout._noGroupLayout`: leaf nodes (tasks, finally, empty
 * placeholders and spacers) are positioned by dagre; non-empty group nodes
 * (the finally group, cycle group) are not fed to dagre — their boxes are
 * derived from their children plus padding, exactly as the original renderer
 * does. Same dagre graph options as the original (ranksep 100, edgesep 158,
 * network-simplex, marginx/y 0) and the same x/y "beautification" alignment.
 */
import * as dagre from '@dagrejs/dagre';

import { AUTOMATIC_CORRECTION_SIZE, Direction } from './constants';
import Rect from './geom/Rect';
import { Padding, PointIface } from './geom/types';
import {
  EdgeModel,
  PipelineNodeModel,
  PositionedEdge,
  PositionedGraph,
  PositionedNode,
} from './model';

const LINK_DISTANCE = 158;
const RANK_SEP = 100;

export interface LayoutOptions {
  direction?: Direction;
  /** outer padding applied around the whole graph */
  graphPadding?: Padding;
}

/** Beautify: snap near-equal coordinates onto a shared value (per the original). */
function beautify(
  positions: Map<string, { x: number; y: number }>,
  level: number,
) {
  const snap = (axis: 'x' | 'y') => {
    const buckets: Record<number, Array<{ x: number; y: number }>> = {};
    for (const node of positions.values()) {
      const num = node[axis];
      const found = Object.keys(buckets)
        .map(Number)
        .find(k => k === num || Math.abs(k - num) <= level);
      if (found != null) {
        buckets[found].push(node);
      } else {
        buckets[num] = [node];
      }
    }
    Object.values(buckets)
      .filter(group => group.length > 1)
      .forEach(group => {
        for (let i = 1; i < group.length; i++) {
          group[i][axis] = group[0][axis];
        }
      });
  };
  snap('x');
  snap('y');
}

export function runDagreLayout(
  nodes: PipelineNodeModel[],
  edges: EdgeModel[],
  options: LayoutOptions = {},
): PositionedGraph {
  const direction = options.direction ?? Direction.LEFT_TO_RIGHT;

  const leafNodes = nodes.filter(n => !n.group);
  const groupNodes = nodes.filter(n => n.group);
  const leafIds = new Set(leafNodes.map(n => n.id));

  const g = new dagre.graphlib.Graph({ compound: false });
  g.setGraph({
    rankdir: direction,
    marginx: 0,
    marginy: 0,
    edgesep: LINK_DISTANCE,
    ranksep: RANK_SEP,
    ranker: 'network-simplex',
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of leafNodes) {
    g.setNode(node.id, {
      width: node.width || 1,
      height: node.height || 1,
    });
  }
  for (const edge of edges) {
    if (leafIds.has(edge.source!) && leafIds.has(edge.target!)) {
      g.setEdge(edge.source!, edge.target!);
    }
  }

  dagre.layout(g);

  // Collect dagre positions (centre coordinates).
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of leafNodes) {
    const dn = g.node(node.id);
    positions.set(node.id, { x: dn?.x ?? 0, y: dn?.y ?? 0 });
  }
  beautify(positions, AUTOMATIC_CORRECTION_SIZE);

  const positionedLeaves: PositionedNode[] = leafNodes.map(node => {
    const p = positions.get(node.id)!;
    return {
      ...node,
      x: p.x,
      y: p.y,
      width: node.width || 1,
      height: node.height || 1,
    };
  });

  const leafById = new Map(positionedLeaves.map(n => [n.id, n]));

  // Group boxes: bounding rect of (recursively) contained leaves + padding.
  const collectLeafIds = (groupId: string, acc: Set<string>) => {
    const grp = groupNodes.find(n => n.id === groupId);
    grp?.children?.forEach(childId => {
      if (leafById.has(childId)) {
        acc.add(childId);
      } else if (groupNodes.some(n => n.id === childId)) {
        collectLeafIds(childId, acc);
      }
    });
    return acc;
  };

  const positionedGroups: PositionedNode[] = groupNodes
    .map(group => {
      const childIds = collectLeafIds(group.id, new Set<string>());
      const rects = [...childIds]
        .map(id => leafById.get(id))
        .filter((n): n is PositionedNode => !!n)
        .map(n => new Rect(n.x - n.width / 2, n.y - n.height / 2, n.width, n.height));
      if (!rects.length) {
        return null;
      }
      const box = rects.reduce((acc, r) => acc.union(r), rects[0].clone());
      const padding = (group.style?.padding as Padding) ?? 0;
      box.padding(padding);
      return {
        ...group,
        x: box.getCenter().x,
        y: box.getCenter().y,
        width: box.width,
        height: box.height,
      } as PositionedNode;
    })
    .filter((n): n is PositionedNode => !!n);

  const positionedEdges: PositionedEdge[] = edges
    .filter(e => leafIds.has(e.source!) && leafIds.has(e.target!))
    .map(edge => {
      const e = g.edge({ v: edge.source!, w: edge.target! });
      let points: PointIface[] = e?.points?.map(p => ({ x: p.x, y: p.y })) ?? [];
      // Fall back to a straight line between snapped node centres.
      if (points.length < 2) {
        const s = leafById.get(edge.source!);
        const t = leafById.get(edge.target!);
        if (s && t) {
          points = [
            { x: s.x, y: s.y },
            { x: t.x, y: t.y },
          ];
        }
      } else {
        // Re-anchor endpoints to the (possibly beautified) node centres.
        const s = leafById.get(edge.source!);
        const t = leafById.get(edge.target!);
        if (s) points[0] = { x: s.x, y: s.y };
        if (t) points[points.length - 1] = { x: t.x, y: t.y };
      }
      return { ...edge, points };
    });

  // Compute overall content bounds and normalise to a top-left origin + padding.
  const allRects = [...positionedLeaves, ...positionedGroups].map(
    n => new Rect(n.x - n.width / 2, n.y - n.height / 2, n.width, n.height),
  );
  let bounds = allRects.length
    ? allRects.reduce((acc, r) => acc.union(r), allRects[0].clone())
    : new Rect(0, 0, 0, 0);
  const gp = options.graphPadding ?? 20;
  bounds = bounds.clone().padding(gp);

  const offsetX = -bounds.x;
  const offsetY = -bounds.y;

  const shift = (n: PositionedNode): PositionedNode => ({
    ...n,
    x: n.x + offsetX,
    y: n.y + offsetY,
  });

  return {
    nodes: [...positionedGroups.map(shift), ...positionedLeaves.map(shift)],
    edges: positionedEdges.map(edge => ({
      ...edge,
      points: edge.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY })),
    })),
    width: bounds.width,
    height: bounds.height,
  };
}
