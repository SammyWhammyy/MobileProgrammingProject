import { ELEVATOR_WEIGHT, STAIRS_WEIGHT_PER_FLOOR } from './astar';
import type { Building, Edge, EdgeKind, Floor, MapNode, Room, Snapshot } from './types';

/** An edge as written by hand: [fromNodeId, toNodeId, kind]. Weight and accessibility are derived. */
export type EdgeSpec = [from: string, to: string, kind?: EdgeKind];

export interface SnapshotSpec {
  building: Building;
  floors: Floor[];
  nodes: MapNode[];
  edges: EdgeSpec[];
  rooms: Room[];
}

/**
 * Builds a snapshot from hand-written data, applying the same rules the server will:
 * walk weight is the Euclidean distance, stairs cost 15 per floor, elevators 30, stairs are not accessible.
 * Throws on references to unknown nodes so typos in map data fail fast.
 */
export function defineSnapshot(spec: SnapshotSpec): Snapshot {
  const nodes = new Map(spec.nodes.map((n) => [n.id, n]));
  const levels = new Map(spec.floors.map((f) => [f.id, f.level]));

  const edges: Edge[] = spec.edges.map(([fromNodeId, toNodeId, kind = 'walk'], i) => {
    const a = nodes.get(fromNodeId);
    const b = nodes.get(toNodeId);
    if (!a || !b) throw new Error(`Edge ${fromNodeId} -> ${toNodeId}: unknown node`);
    if (a === b) throw new Error(`Edge ${fromNodeId}: connects a node to itself`);
    let weight: number;
    if (kind === 'walk') {
      if (a.floorId !== b.floorId) throw new Error(`Walk edge ${fromNodeId} -> ${toNodeId} crosses floors`);
      weight = Math.hypot(a.x - b.x, a.y - b.y);
    } else {
      if (a.floorId === b.floorId) throw new Error(`${kind} edge ${fromNodeId} -> ${toNodeId} stays on one floor`);
      const floors = Math.abs((levels.get(a.floorId) ?? 0) - (levels.get(b.floorId) ?? 0));
      weight = kind === 'stairs' ? STAIRS_WEIGHT_PER_FLOOR * floors : ELEVATOR_WEIGHT;
    }
    return { id: `e${i + 1}`, fromNodeId, toNodeId, kind, weight, accessible: kind !== 'stairs' };
  });

  for (const room of spec.rooms) {
    if (!nodes.has(room.doorNodeId)) throw new Error(`Room ${room.code}: unknown door node ${room.doorNodeId}`);
  }

  return { building: spec.building, floors: spec.floors, nodes: spec.nodes, edges, rooms: spec.rooms };
}
