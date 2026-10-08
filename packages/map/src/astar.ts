import type { Graph } from './graph';
import { MinHeap } from './heap';

export const STAIRS_WEIGHT_PER_FLOOR = 15;
export const ELEVATOR_WEIGHT = 30;

export interface PathResult {
  nodeIds: string[];
  lengthM: number;
}

/**
 * A* shortest path over the whole building graph.
 * The heuristic is the planar distance plus the cheapest possible cost of changing floors,
 * so it never overestimates and the result is exact. Returns null when the goal is unreachable.
 */
export function findPath(graph: Graph, startId: string, goalId: string): PathResult | null {
  const goal = graph.nodes.get(goalId);
  if (!goal || !graph.nodes.has(startId)) return null;
  if (startId === goalId) return { nodeIds: [startId], lengthM: 0 };

  const goalLevel = graph.levels.get(goal.floorId) ?? 0;
  const floorCost = graph.mode === 'accessible' ? ELEVATOR_WEIGHT : STAIRS_WEIGHT_PER_FLOOR;
  const heuristic = (id: string) => {
    const n = graph.nodes.get(id)!;
    const level = graph.levels.get(n.floorId) ?? 0;
    return Math.hypot(n.x - goal.x, n.y - goal.y) + floorCost * Math.abs(level - goalLevel);
  };

  const cost = new Map<string, number>([[startId, 0]]);
  const cameFrom = new Map<string, string>();
  const closed = new Set<string>();
  const open = new MinHeap<string>();
  open.push(startId, heuristic(startId));

  while (open.size > 0) {
    const current = open.pop()!;
    if (current === goalId) {
      const nodeIds = [current];
      for (let id = cameFrom.get(current); id !== undefined; id = cameFrom.get(id)) nodeIds.push(id);
      nodeIds.reverse();
      return { nodeIds, lengthM: cost.get(current)! };
    }
    if (closed.has(current)) continue;
    closed.add(current);

    const base = cost.get(current)!;
    for (const link of graph.adjacency.get(current) ?? []) {
      if (closed.has(link.to)) continue;
      const next = base + link.weight;
      if (next < (cost.get(link.to) ?? Infinity)) {
        cost.set(link.to, next);
        cameFrom.set(link.to, current);
        open.push(link.to, next + heuristic(link.to));
      }
    }
  }
  return null;
}
