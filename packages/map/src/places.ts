import type { Place, Snapshot } from './types';

const PICKABLE_NODE_TYPES = new Set(['entrance', 'stairs', 'elevator']);

/** Rooms plus labelled entrances, stairs and elevators, sorted by floor and title. */
export function listPlaces(snapshot: Snapshot): Place[] {
  const floorName = new Map(snapshot.floors.map((f) => [f.id, f.name]));
  const level = new Map(snapshot.floors.map((f) => [f.id, f.level]));

  const rooms: Place[] = snapshot.rooms.map((r) => ({
    id: `room:${r.id}`,
    nodeId: r.doorNodeId,
    floorId: r.floorId,
    title: r.code,
    subtitle: `${r.name} · ${floorName.get(r.floorId) ?? ''}`,
    kind: 'room',
    roomId: r.id,
  }));

  const points: Place[] = snapshot.nodes
    .filter((n) => n.label && PICKABLE_NODE_TYPES.has(n.type))
    .map((n) => ({
      id: `node:${n.id}`,
      nodeId: n.id,
      floorId: n.floorId,
      title: n.label!,
      subtitle: floorName.get(n.floorId) ?? '',
      kind: n.type,
    }));

  return [...points, ...rooms].sort(
    (a, b) => (level.get(a.floorId) ?? 0) - (level.get(b.floorId) ?? 0) || a.title.localeCompare(b.title),
  );
}

/** Case-insensitive search over room code, name and tags, and over point labels. */
export function searchPlaces(snapshot: Snapshot, places: Place[], query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return places;
  const rooms = new Map(snapshot.rooms.map((r) => [r.id, r]));
  return places.filter((p) => {
    if (p.title.toLowerCase().includes(q)) return true;
    const room = p.roomId ? rooms.get(p.roomId) : undefined;
    return !!room && (room.name.toLowerCase().includes(q) || room.tags.some((t) => t.toLowerCase().includes(q)));
  });
}
