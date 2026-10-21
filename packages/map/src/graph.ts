import type { Edge, MapNode, RouteMode, Snapshot } from './types';

export interface GraphLink {
  to: string;
  weight: number;
  edge: Edge;
}

export interface Graph {
  nodes: Map<string, MapNode>;
  /** Floor level by floor id. */
  levels: Map<string, number>;
  adjacency: Map<string, GraphLink[]>;
  mode: RouteMode;
}

/** Builds an undirected adjacency list. Accessible mode drops edges with `accessible: false` (stairs). */
export function buildGraph(snapshot: Snapshot, mode: RouteMode = 'fastest'): Graph {
  const nodes = new Map(snapshot.nodes.map((n) => [n.id, n]));
  const levels = new Map(snapshot.floors.map((f) => [f.id, f.level]));
  const adjacency = new Map<string, GraphLink[]>();
  for (const n of snapshot.nodes) adjacency.set(n.id, []);

  for (const edge of snapshot.edges) {
    if (mode === 'accessible' && !edge.accessible) continue;
    const from = adjacency.get(edge.fromNodeId);
    const to = adjacency.get(edge.toNodeId);
    if (!from || !to) continue;
    from.push({ to: edge.toNodeId, weight: edge.weight, edge });
    to.push({ to: edge.fromNodeId, weight: edge.weight, edge });
  }

  return { nodes, levels, adjacency, mode };
}
