import { PLAN_ROOM_COLOR, PLAN_WALL_COLOR } from './planColors';
import type { MapNode, Room, RoomCategory } from '../types';

/** [x, y, width, height] in meters. */
export type Rect = [x: number, y: number, w: number, h: number];

export interface RectRoomSpec {
  code: string;
  name: string;
  category: RoomCategory;
  rect: Rect;
  /** Door node position: on the corridor axis in front of the door. */
  door: [x: number, y: number];
  tags?: string[];
}

export interface RectPlanSpec {
  floorId: string;
  widthM: number;
  heightM: number;
  rooms: RectRoomSpec[];
  /** Non-searchable spaces drawn on the plan: closets, stairs, lifts. */
  spaces?: { id: string; rect: Rect }[];
  /** Extra wall paths in meters (SVG path data). */
  walls?: string[];
}

export const doorNodeId = (code: string) => `d-${code}`;

/** Builds rooms, their door nodes and an SVG plan from rectangles, for plans approximated by hand. */
export function rectPlan(spec: RectPlanSpec): { rooms: Room[]; doorNodes: MapNode[]; svg: string } {
  const rooms: Room[] = spec.rooms.map((r) => ({
    id: `r-${r.code}`,
    floorId: spec.floorId,
    code: r.code,
    name: r.name,
    category: r.category,
    doorNodeId: doorNodeId(r.code),
    tags: r.tags ?? [],
    labelAt: { x: r.rect[0] + r.rect[2] / 2, y: r.rect[1] + r.rect[3] / 2 },
  }));

  const doorNodes: MapNode[] = spec.rooms.map((r) => ({
    id: doorNodeId(r.code),
    floorId: spec.floorId,
    x: r.door[0],
    y: r.door[1],
    type: 'door',
  }));

  const rect = (id: string, [x, y, w, h]: Rect) =>
    `<rect id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${PLAN_ROOM_COLOR}" stroke="${PLAN_WALL_COLOR}" stroke-width="0.15"/>`;
  const wall = (d: string) => `<path d="${d}" fill="none" stroke="${PLAN_WALL_COLOR}" stroke-width="0.3"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.widthM} ${spec.heightM}">
<g id="rooms">
${spec.rooms.map((r) => rect(`room-${r.code}`, r.rect)).join('\n')}
${(spec.spaces ?? []).map((s) => rect(s.id, s.rect)).join('\n')}
</g>
<g id="walls">
${(spec.walls ?? []).map(wall).join('\n')}
</g>
</svg>`;

  return { rooms, doorNodes, svg };
}
