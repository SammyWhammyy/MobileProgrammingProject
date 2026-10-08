import { findPath } from './astar';
import { buildGraph, type Graph } from './graph';
import { buildSteps, splitByFloor } from './steps';
import type { Route, RouteMode, Snapshot } from './types';

const graphCache = new WeakMap<Snapshot, Partial<Record<RouteMode, Graph>>>();

/** Returns the graph for a snapshot, building it once per snapshot and mode. */
export function getGraph(snapshot: Snapshot, mode: RouteMode): Graph {
  let byMode = graphCache.get(snapshot);
  if (!byMode) graphCache.set(snapshot, (byMode = {}));
  return (byMode[mode] ??= buildGraph(snapshot, mode));
}

/** Plans a route between two graph nodes. Returns null when no route exists in this mode. */
export function planRoute(snapshot: Snapshot, fromNodeId: string, toNodeId: string, mode: RouteMode = 'fastest'): Route | null {
  const graph = getGraph(snapshot, mode);
  const path = findPath(graph, fromNodeId, toNodeId);
  if (!path) return null;
  return {
    nodeIds: path.nodeIds,
    lengthM: path.lengthM,
    mode,
    segments: splitByFloor(graph, path.nodeIds),
    steps: buildSteps(graph, path.nodeIds),
  };
}
