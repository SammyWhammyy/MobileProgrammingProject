import type { Graph } from './graph';
import type { MapNode, RouteSegment, RouteStep } from './types';

/** Splits a path into per-floor segments. A new segment starts wherever the floor changes. */
export function splitByFloor(graph: Graph, nodeIds: string[]): RouteSegment[] {
  const segments: RouteSegment[] = [];
  for (const id of nodeIds) {
    const node = graph.nodes.get(id)!;
    const last = segments[segments.length - 1];
    if (last && last.floorId === node.floorId) last.nodeIds.push(id);
    else segments.push({ floorId: node.floorId, nodeIds: [id] });
  }
  return segments;
}

const STRAIGHT_MAX_DEG = 30;
const TURN_MAX_DEG = 150;

/**
 * Classifies the turn at `b` when walking a → b → c.
 * Plan coordinates have y pointing down, so a positive cross product is a right turn.
 */
export function turnAt(a: MapNode, b: MapNode, c: MapNode): 'straight' | 'left' | 'right' | 'back' {
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const vx = c.x - b.x;
  const vy = c.y - b.y;
  const lu = Math.hypot(ux, uy);
  const lv = Math.hypot(vx, vy);
  if (lu === 0 || lv === 0) return 'straight';
  const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)));
  const deg = (Math.acos(cos) * 180) / Math.PI;
  if (deg < STRAIGHT_MAX_DEG) return 'straight';
  if (deg > TURN_MAX_DEG) return 'back';
  return ux * vy - uy * vx > 0 ? 'right' : 'left';
}

/** Distances in steps are rounded to 5 m, never below 5 m. */
export function roundDistance(m: number) {
  return Math.max(5, Math.round(m / 5) * 5);
}

/**
 * Turns a path into user-facing steps: straight runs, turns, floor changes and arrival.
 * Consecutive straight parts are merged.
 */
export function buildSteps(graph: Graph, nodeIds: string[]): RouteStep[] {
  const steps: RouteStep[] = [];
  if (nodeIds.length === 0) return steps;
  const nodes = nodeIds.map((id) => graph.nodes.get(id)!);

  let runStart = 0;
  let runM = 0;
  const flushRun = () => {
    if (runM > 0) {
      const n = nodes[runStart];
      steps.push({ kind: 'straight', floorId: n.floorId, nodeId: n.id, distanceM: roundDistance(runM) });
    }
    runM = 0;
  };

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const cur = nodes[i];

    if (cur.floorId !== prev.floorId) {
      flushRun();
      const toLevel = graph.levels.get(cur.floorId) ?? 0;
      const fromLevel = graph.levels.get(prev.floorId) ?? 0;
      steps.push({
        kind: 'changeFloor',
        floorId: prev.floorId,
        nodeId: prev.id,
        via: prev.type === 'elevator' ? 'elevator' : 'stairs',
        toFloorId: cur.floorId,
        toLevel,
        up: toLevel > fromLevel,
        label: prev.label,
      });
      runStart = i;
      continue;
    }

    runM += Math.hypot(cur.x - prev.x, cur.y - prev.y);

    const next = nodes[i + 1];
    if (next && next.floorId === cur.floorId) {
      const turn = turnAt(prev, cur, next);
      if (turn !== 'straight') {
        flushRun();
        steps.push({ kind: 'turn', floorId: cur.floorId, nodeId: cur.id, direction: turn });
        runStart = i;
      }
    }
  }
  flushRun();

  const last = nodes[nodes.length - 1];
  steps.push({ kind: 'arrive', floorId: last.floorId, nodeId: last.id });
  return steps;
}
