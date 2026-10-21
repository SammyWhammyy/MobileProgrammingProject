import type { MapBundle } from './types';

/** Rejects broken references and malformed graph geometry before rendering. */
export function assertMapBundle(bundle: MapBundle): void {
  const { snapshot, svgByFloor } = bundle;
  const unique = <T extends { id: string }>(items: T[], kind: string) => {
    const map = new Map(items.map((item) => [item.id, item]));
    if (map.size !== items.length || items.some((item) => !item.id)) throw new Error(`Invalid ${kind} IDs`);
    return map;
  };
  const floors = unique(snapshot.floors, 'floor');
  const nodes = unique(snapshot.nodes, 'node');
  unique(snapshot.edges, 'edge');
  unique(snapshot.rooms, 'room');
  if (!floors.size) throw new Error('Map has no floors');
  for (const floor of floors.values()) {
    if (floor.buildingId !== snapshot.building.id || !Number.isInteger(floor.level)
      || !Number.isFinite(floor.widthM) || !Number.isFinite(floor.heightM)
      || floor.widthM <= 0 || floor.heightM <= 0 || !svgByFloor[floor.id]) {
      throw new Error(`Invalid floor: ${floor.id}`);
    }
  }
  for (const node of nodes.values()) {
    const floor = floors.get(node.floorId);
    if (!floor || !Number.isFinite(node.x) || !Number.isFinite(node.y)
      || node.x < 0 || node.x > floor.widthM || node.y < 0 || node.y > floor.heightM) {
      throw new Error(`Invalid node: ${node.id}`);
    }
  }
  for (const edge of snapshot.edges) {
    const a = nodes.get(edge.fromNodeId);
    const b = nodes.get(edge.toNodeId);
    if (!a || !b || a.id === b.id || !Number.isFinite(edge.weight) || edge.weight < 0
      || (edge.kind === 'walk' ? a.floorId !== b.floorId : a.floorId === b.floorId)
      || (edge.kind === 'stairs' && edge.accessible)) {
      throw new Error(`Invalid edge: ${edge.id}`);
    }
  }
  const codes = new Set<string>();
  for (const room of snapshot.rooms) {
    const door = nodes.get(room.doorNodeId);
    if (!door || door.floorId !== room.floorId || !room.code || codes.has(room.code)) throw new Error(`Invalid room: ${room.id}`);
    codes.add(room.code);
  }
}
