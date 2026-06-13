/*
 * <Topology> — a generic React renderer for the ported topology engine. Give it
 * a list of pipeline node models (tasks/finally/groups/placeholders, as built by
 * a caller-supplied transform) and a registry mapping node `type` -> React
 * component; it runs the layout (cycles -> topological order -> dagre) and
 * renders absolutely-positioned nodes over an SVG edge layer, with built-in
 * pan/zoom and hover/select state. Reusable for any relationship/DAG view.
 */
import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { buildGraph, BuildGraphOptions } from '../buildGraph';
import {
  DEFAULT_EDGE_TYPE,
  DEFAULT_RESULT_EDGE_TYPE,
  Direction,
} from '../constants';
import {
  ApartmentOutlined,
  ExpandOutlined,
  MinusOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { createStyles } from 'antd-style';

import { orthogonalElbowPath } from '../edge-path';
import { PositionedEdge, PositionedNode, PipelineNodeModel } from '../model';
import { PointIface } from '../geom/types';

export interface NodeRenderProps {
  node: PositionedNode;
  hovered: boolean;
  selected: boolean;
  isCycle: boolean;
  /** current layout direction, so nodes can place edge affordances correctly */
  direction: Direction;
}

export type NodeComponents = Record<
  string,
  (props: NodeRenderProps) => ReactNode
>;

export interface TopologyProps {
  /** Transformed node models (tasks, finally, groups, empty placeholders). */
  nodes: PipelineNodeModel[];
  options?: BuildGraphOptions;
  /** type -> renderer. Unregistered types are skipped. */
  nodeComponents: NodeComponents;
  selectedId?: string | null;
  onSelectNode?: (id: string | null) => void;
  edgeColor?: (edge: PositionedEdge) => string;
  className?: string;
  style?: CSSProperties;
  minScale?: number;
  maxScale?: number;
  /** Show the bottom-right view toolbar (layout / fit / zoom). Default true. */
  controls?: boolean;
}

const useStyles = createStyles(({ token, css }) => ({
  bar: css`
    position: absolute;
    right: 16px;
    bottom: 16px;
    display: flex;
    gap: 8px;
    user-select: none;
    z-index: 10;
  `,
  segment: css`
    display: flex;
    align-items: center;
    height: 30px;
    background: ${token.colorBgElevated};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    box-shadow: ${token.boxShadowTertiary};
    overflow: hidden;
  `,
  btn: css`
    height: 30px;
    min-width: 34px;
    padding: 0 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextSecondary};
    transition: background 0.15s, color 0.15s;
    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }
  `,
  percent: css`
    min-width: 52px;
    text-align: center;
    font-size: ${token.fontSize}px;
    color: ${token.colorTextSecondary};
    font-variant-numeric: tabular-nums;
  `,
  oneToOne: css`
    font-size: ${token.fontSize}px;
    color: ${token.colorTextSecondary};
  `,
}));

export function Topology({
  nodes,
  options,
  nodeComponents,
  selectedId = null,
  onSelectNode,
  edgeColor,
  className,
  style,
  minScale = 0.2,
  maxScale = 2,
  controls = true,
}: TopologyProps) {
  const { theme } = useStyles();
  const edgeColorFn =
    edgeColor ??
    ((edge: PositionedEdge) =>
      edge.type === DEFAULT_RESULT_EDGE_TYPE
        ? theme.colorSuccess
        : theme.colorTextTertiary);

  const [direction, setDirection] = useState(
    options?.direction ?? Direction.LEFT_TO_RIGHT,
  );

  const graph = useMemo(
    () => buildGraph(nodes, { ...options, direction }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, options?.mode, direction, JSON.stringify(options?.finallyNodeTypes)],
  );

  const cycleSet = useMemo(() => new Set(graph.cycleNodeIds), [graph]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const interacted = useRef(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // --- view controls (bottom-right toolbar) ---
  const applyZoom = (factor: number) => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const px = el.clientWidth / 2;
    const py = el.clientHeight / 2;
    interacted.current = true;
    setView(v => {
      const scale = Math.min(maxScale, Math.max(minScale, v.scale * factor));
      const k = scale / v.scale;
      return { scale, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k };
    });
  };

  const fitView = () => {
    const el = containerRef.current;
    if (!el || !graph.width || !graph.height) {
      return;
    }
    interacted.current = true;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const scale = Math.min(1, cw / graph.width, ch / graph.height);
    setView({
      scale,
      tx: (cw - graph.width * scale) / 2,
      ty: (ch - graph.height * scale) / 2,
    });
  };

  const resetZoom = () => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    interacted.current = true;
    setView({
      scale: 1,
      tx: (el.clientWidth - graph.width) / 2,
      ty: (el.clientHeight - graph.height) / 2,
    });
  };

  const toggleDirection = () => {
    // Re-fit after the relayout.
    interacted.current = false;
    setDirection(d =>
      d === Direction.LEFT_TO_RIGHT
        ? Direction.TOP_TO_BOTTOM
        : Direction.LEFT_TO_RIGHT,
    );
  };

  // Auto-fit content into the container until the user pans/zooms manually.
  useLayoutEffect(() => {
    if (interacted.current) {
      return;
    }
    const el = containerRef.current;
    if (!el || !graph.width || !graph.height) {
      return;
    }
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (!cw || !ch) {
      return;
    }
    const scale = Math.min(1, cw / graph.width, ch / graph.height);
    const tx = (cw - graph.width * scale) / 2;
    const ty = (ch - graph.height * scale) / 2;
    setView({ scale, tx, ty });
  }, [graph]);

  // Pan by dragging anywhere on the canvas. Interactive nodes stop propagation
  // on pointerdown, so a press that reaches here is on empty canvas / a group
  // box / an edge — i.e. anywhere except a node card.
  const dragging = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    dragging.current = {
      x: e.clientX,
      y: e.clientY,
      ox: e.clientX,
      oy: e.clientY,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragging.current;
    if (!drag) {
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    // Ignore sub-pixel jitter so a plain click is not treated as a pan.
    if (Math.abs(e.clientX - drag.ox) + Math.abs(e.clientY - drag.oy) > 3) {
      drag.moved = true;
      interacted.current = true;
    }
    if (drag.moved) {
      setView(v => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
    }
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const drag = dragging.current;
    dragging.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    // A click on empty canvas (no drag) clears the selection; a pan does not.
    if (drag && !drag.moved) {
      onSelectNode?.(null);
    }
  };

  const onWheel = (e: ReactWheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) {
      return;
    }
    e.preventDefault();
    interacted.current = true;
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setView(v => {
      const factor = Math.exp(-e.deltaY * 0.0015);
      const scale = Math.min(maxScale, Math.max(minScale, v.scale * factor));
      const k = scale / v.scale;
      return {
        scale,
        tx: px - (px - v.tx) * k,
        ty: py - (py - v.ty) * k,
      };
    });
  };

  // Disable native ctrl-wheel page zoom inside the canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const groupNodes = graph.nodes.filter(n => n.group);
  const leafNodes = graph.nodes.filter(n => !n.group);

  const nodeById = new Map(graph.nodes.map(n => [n.id, n]));

  // Shared trunk distance: the bus sits this far past the source's exit edge,
  // so sibling edges from the same source (and merges from the same column)
  // share a vertical line — matching the reference look. Kept generous so the
  // aggregation bus doesn't crowd the node it sits behind (capped at the column
  // midpoint below, so it never overshoots the target).
  const TRUNK = 46;

  // Anchor an edge at the source/target card borders and pick the shared bus
  // coordinate (LR: a vertical bus x; TB: a horizontal bus y).
  const edgeGeometry = (
    edge: PositionedEdge,
  ): { start: PointIface; end: PointIface; axis: number } | null => {
    const s = nodeById.get(edge.source ?? '');
    const t = nodeById.get(edge.target ?? '');
    if (!s || !t) {
      return null;
    }
    if (direction === Direction.TOP_TO_BOTTOM) {
      const start = { x: s.x, y: s.y + s.height / 2 };
      const end = { x: t.x, y: t.y - t.height / 2 };
      const gap = end.y - start.y;
      const axis = start.y + (gap > 0 ? Math.min(TRUNK, gap / 2) : gap / 2);
      return { start, end, axis };
    }
    const start = { x: s.x + s.width / 2, y: s.y };
    const end = { x: t.x - t.width / 2, y: t.y };
    const gap = end.x - start.x;
    const axis = start.x + (gap > 0 ? Math.min(TRUNK, gap / 2) : gap / 2);
    return { start, end, axis };
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        cursor: dragging.current ? 'grabbing' : 'grab',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          transformOrigin: '0 0',
          width: graph.width,
          height: graph.height,
        }}
      >
        {/* group boxes (behind everything) */}
        {groupNodes.map(node => {
          const Comp = nodeComponents[node.type];
          return (
            <NodeBox key={node.id} node={node}>
              {Comp ? (
                <Comp
                  node={node}
                  hovered={hoveredId === node.id}
                  selected={selectedId === node.id}
                  isCycle={cycleSet.has(node.id)}
                  direction={direction}
                />
              ) : null}
            </NodeBox>
          );
        })}

        {/* edges */}
        <svg
          width={graph.width}
          height={graph.height}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
          {graph.edges.map(edge => {
            const geo = edgeGeometry(edge);
            if (!geo) {
              return null;
            }
            return (
              <Edge
                key={edge.id}
                edge={edge}
                start={geo.start}
                end={geo.end}
                axis={geo.axis}
                direction={direction}
                color={edgeColorFn(edge)}
              />
            );
          })}
        </svg>

        {/* leaf nodes (on top) */}
        {leafNodes.map(node => {
          const Comp = nodeComponents[node.type];
          if (!Comp) {
            return null;
          }
          return (
            <NodeBox
              key={node.id}
              node={node}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(h => (h === node.id ? null : h))}
            >
              <Comp
                node={node}
                hovered={hoveredId === node.id}
                selected={selectedId === node.id}
                isCycle={cycleSet.has(node.id)}
                direction={direction}
              />
            </NodeBox>
          );
        })}
      </div>

      {controls && (
        <Controls
          percent={Math.round(view.scale * 100)}
          direction={direction}
          onToggleDirection={toggleDirection}
          onFit={fitView}
          onZoomIn={() => applyZoom(1.2)}
          onZoomOut={() => applyZoom(1 / 1.2)}
          onReset={resetZoom}
        />
      )}
    </div>
  );
}

function Controls({
  percent,
  direction,
  onToggleDirection,
  onFit,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  percent: number;
  direction: Direction;
  onToggleDirection: () => void;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const { styles } = useStyles();
  return (
    <div
      className={styles.bar}
      // Keep clicks on the toolbar from panning/deselecting the canvas.
      onPointerDown={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      <div className={styles.segment}>
        <ToolButton
          title={
            direction === Direction.LEFT_TO_RIGHT
              ? 'Vertical layout'
              : 'Horizontal layout'
          }
          onClick={onToggleDirection}
        >
          <ApartmentOutlined
            rotate={direction === Direction.LEFT_TO_RIGHT ? 0 : -90}
          />
        </ToolButton>
        <ToolButton title="Fit to view" onClick={onFit}>
          <ExpandOutlined />
        </ToolButton>
      </div>

      <div className={styles.segment}>
        <ToolButton title="Zoom out" onClick={onZoomOut}>
          <MinusOutlined />
        </ToolButton>
        <div className={styles.percent}>{percent}%</div>
        <ToolButton title="Zoom in" onClick={onZoomIn}>
          <PlusOutlined />
        </ToolButton>
      </div>

      <div className={styles.segment}>
        <ToolButton title="Reset to 100%" onClick={onReset}>
          <span className={styles.oneToOne}>1:1</span>
        </ToolButton>
      </div>
    </div>
  );
}

function ToolButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const { styles } = useStyles();
  return (
    <button type="button" title={title} onClick={onClick} className={styles.btn}>
      {children}
    </button>
  );
}

function NodeBox({
  node,
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  node: PositionedNode;
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      data-node-id={node.id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        left: node.x - node.width / 2,
        top: node.y - node.height / 2,
        width: node.width,
        height: node.height,
      }}
    >
      {children}
    </div>
  );
}

function Edge({
  edge,
  start,
  end,
  axis,
  direction,
  color,
}: {
  edge: PositionedEdge;
  start: PointIface;
  end: PointIface;
  axis: number;
  direction: Direction;
  color: string;
}) {
  const d = orthogonalElbowPath(start, end, axis, direction);
  if (!d) {
    return null;
  }
  const dashed =
    edge.type !== DEFAULT_EDGE_TYPE && edge.type !== DEFAULT_RESULT_EDGE_TYPE;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray={dashed ? '5 4' : undefined}
    />
  );
}
