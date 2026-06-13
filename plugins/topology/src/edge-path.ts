/*
 * SVG edge path generation. Ported from the console `@topology` lib
 * (`components/edge/utils.ts`): straight polyline with rounded right-angle
 * bends, matching the original pipeline edge look.
 */
import { BEZIER_CURVATURE, Direction } from './constants';
import { PointIface } from './geom/types';

const clamp = (lower: number, value: number, upper: number) =>
  Math.min(Math.max(value, Math.min(lower, upper)), Math.max(lower, upper));

export function getStraightPath(
  start: PointIface,
  bends: PointIface[],
  end: PointIface,
) {
  const bendsPath = bends.reduce((acc, cur) => acc + `L ${cur.x},${cur.y} `, '');
  return `M ${start.x},${start.y} ${bendsPath}L ${end.x},${end.y}`;
}

/**
 * Orthogonal "elbow" edge with rounded corners, routed through a single shared
 * trunk coordinate (`axis`): for LR that is a vertical bus at x=`axis`, for TB a
 * horizontal bus at y=`axis`. Endpoints are the source/target card borders.
 * Reproduces the pipeline view's look — lines exit the source edge, run to the
 * shared bus, turn once, and enter the target edge. Siblings that share a bus x
 * fan out from a common trunk.
 */
export function orthogonalElbowPath(
  start: PointIface,
  end: PointIface,
  axis: number,
  direction: Direction = Direction.LEFT_TO_RIGHT,
) {
  if (direction === Direction.TOP_TO_BOTTOM) {
    // Nearly aligned: a single rounded corner would fold back on itself, so draw
    // a straight (near-horizontal) line instead.
    if (Math.abs(start.x - end.x) <= BEZIER_CURVATURE) {
      return `M ${start.x},${start.y} L ${end.x},${end.y}`;
    }
    return getVerticalBezierCurvePath(start, end, axis);
  }
  if (Math.abs(start.y - end.y) <= BEZIER_CURVATURE) {
    return `M ${start.x},${start.y} L ${end.x},${end.y}`;
  }
  return getHorizontalBezierCurvePath(start, end, axis);
}

export function getBezierCurvePath(
  points: PointIface[],
  direction: Direction = Direction.LEFT_TO_RIGHT,
) {
  if (points.length < 2) {
    return '';
  }
  const start = points[0];
  const end = points[points.length - 1];
  const bends = points.slice(1, -1);

  if (shouldAutoCorrect(start, end) || !bends.length) {
    return getStraightPath(start, [], end);
  }

  if (shouldBeautifyCurve(start, bends, end, direction)) {
    const path = beautifyCurve(start, bends, end, direction);
    if (path) {
      return path;
    }
  }

  return getStraightPath(start, bends, end);
}

function shouldAutoCorrect(start: PointIface, end: PointIface) {
  return (
    Math.abs(start.x - end.x) <= BEZIER_CURVATURE ||
    Math.abs(start.y - end.y) <= BEZIER_CURVATURE
  );
}

function shouldBeautifyCurve(
  start: PointIface,
  bends: PointIface[],
  end: PointIface,
  direction: Direction,
) {
  return direction === Direction.LEFT_TO_RIGHT
    ? bends.every(bend => clamp(start.x, bend.x, end.x) === bend.x)
    : bends.every(bend => clamp(start.y, bend.y, end.y) === bend.y);
}

function beautifyCurve(
  start: PointIface,
  bends: PointIface[],
  end: PointIface,
  direction: Direction,
) {
  if (bends.length === 1) {
    return direction === Direction.LEFT_TO_RIGHT
      ? getHorizontalBezierCurvePath(start, end, bends[0].x)
      : getVerticalBezierCurvePath(start, end, bends[0].y);
  }

  if (bends.length === 2) {
    const mid = {
      x: (bends[0].x + bends[1].x) / 2,
      y: (bends[0].y + bends[1].y) / 2,
    };
    return direction === Direction.LEFT_TO_RIGHT
      ? getHorizontalBezierCurvePath(start, mid, bends[0].x) +
          getHorizontalBezierCurvePath(mid, end, bends[1].x)
      : getVerticalBezierCurvePath(start, mid, bends[0].y) +
          getVerticalBezierCurvePath(mid, end, bends[1].y);
  }
  return null;
}

function getHorizontalBezierCurvePath(
  start: PointIface,
  end: PointIface,
  bendX: number,
) {
  let offsetY = BEZIER_CURVATURE / 2;
  const offsetX = BEZIER_CURVATURE / 2;
  const { x: x1, y: y1 } = start;
  const { x: x3, y: y3 } = end;
  if (y3 < y1) {
    offsetY = -offsetY;
  }
  return `M ${x1},${y1} L ${bendX - offsetX},${y1} Q ${bendX},${y1} ${bendX},${y1 + offsetY} L ${bendX},${y3 - offsetY} Q ${bendX},${y3} ${bendX + offsetX},${y3} L ${x3},${y3}`;
}

function getVerticalBezierCurvePath(
  start: PointIface,
  end: PointIface,
  bendY: number,
) {
  const offsetY = BEZIER_CURVATURE / 2;
  let offsetX = BEZIER_CURVATURE / 2;
  const { x: x1, y: y1 } = start;
  const { x: x3, y: y3 } = end;
  if (x3 < x1) {
    offsetX = -offsetX;
  }
  return `M ${x1},${y1} L ${x1},${bendY - offsetY} Q ${x1},${bendY} ${x1 + offsetX},${bendY} L ${x3 - offsetX},${bendY} Q ${x3},${bendY} ${x3},${bendY + offsetY} L ${x3},${y3}`;
}
