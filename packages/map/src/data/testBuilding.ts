import { defineSnapshot, type EdgeSpec } from '../authoring';
import type { MapBundle, MapNode } from '../types';
import { doorNodeId, rectPlan, type RectRoomSpec } from './rectPlan';

/**
 * Made-up single-floor building used by tests.
 * An L-shaped corridor: a main corridor along y = 10 from the entrance, turning down along x = 56 to the stairs.
 */

const FLOOR_ID = 'f1';
const WIDTH_M = 64;
const HEIGHT_M = 40;

const ROOMS: RectRoomSpec[] = [
  { code: 'A101', name: 'Lecture hall', category: 'classroom', rect: [0, 0, 12, 8], door: [6, 10], tags: ['projector'] },
  { code: 'A102', name: 'Classroom', category: 'classroom', rect: [12, 0, 12, 8], door: [18, 10] },
  { code: 'A103', name: 'Classroom', category: 'classroom', rect: [24, 0, 12, 8], door: [30, 10], tags: ['sockets'] },
  { code: 'A104', name: 'Computer lab', category: 'lab', rect: [36, 0, 12, 8], door: [40, 10], tags: ['computers'] },
  { code: 'A105', name: 'Meeting room', category: 'other', rect: [48, 0, 16, 8], door: [52, 10] },
  { code: 'A106', name: 'Classroom', category: 'classroom', rect: [58, 8, 6, 12], door: [56, 14] },
  { code: 'A107', name: 'Workshop', category: 'lab', rect: [58, 20, 6, 16], door: [56, 26] },
  { code: 'A108', name: "Teachers' office", category: 'office', rect: [46, 12, 8, 12], door: [56, 18] },
  { code: 'A110', name: 'IoT lab', category: 'lab', rect: [0, 12, 16, 28], door: [8, 10], tags: ['iot', 'sockets'] },
  { code: 'WC1', name: 'Toilets', category: 'wc', rect: [16, 12, 6, 12], door: [20, 10] },
  { code: 'C101', name: 'Cafeteria', category: 'cafe', rect: [22, 12, 18, 12], door: [34, 10], tags: ['coffee'] },
  { code: 'L101', name: 'Library', category: 'library', rect: [16, 24, 38, 16], door: [56, 30], tags: ['quiet'] },
];

const plan = rectPlan({
  floorId: FLOOR_ID,
  widthM: WIDTH_M,
  heightM: HEIGHT_M,
  rooms: ROOMS,
  spaces: [
    { id: 'lift-1', rect: [40, 12, 6, 12] },
    { id: 'stairs-B', rect: [54, 36, 10, 4] },
  ],
  walls: [`M0 8V0H${WIDTH_M}V${HEIGHT_M}H0V12`],
});

const nodes: MapNode[] = [
  { id: 'entrance', floorId: FLOOR_ID, x: 1, y: 10, type: 'entrance', label: 'Main entrance' },
  { id: 'lift', floorId: FLOOR_ID, x: 43, y: 10, type: 'elevator', label: 'Elevator' },
  { id: 'corner', floorId: FLOOR_ID, x: 56, y: 10, type: 'corridor' },
  { id: 'stairs-b', floorId: FLOOR_ID, x: 56, y: 36, type: 'stairs', label: 'Stairs B' },
  ...plan.doorNodes,
];

/** Chains nodes along a corridor in the given order. */
function chain(ids: string[]): EdgeSpec[] {
  return ids.slice(1).map((id, i) => [ids[i], id]);
}

const asNodeId = (id: string) => (ROOMS.some((r) => r.code === id) ? doorNodeId(id) : id);
const mainCorridor = ['entrance', 'A101', 'A110', 'A102', 'WC1', 'A103', 'C101', 'A104', 'lift', 'A105', 'corner'];
const sideCorridor = ['corner', 'A106', 'A108', 'A107', 'L101', 'stairs-b'];

const snapshot = defineSnapshot({
  building: { id: 'test-building', name: 'Test building', address: '', dataVersion: 1 },
  floors: [
    { id: FLOOR_ID, buildingId: 'test-building', level: 1, name: 'Floor 1', svgUrl: '', widthM: WIDTH_M, heightM: HEIGHT_M },
  ],
  nodes,
  edges: [...chain(mainCorridor.map(asNodeId)), ...chain(sideCorridor.map(asNodeId))],
  rooms: plan.rooms,
});

export const testBuilding: MapBundle = { snapshot, svgByFloor: { [FLOOR_ID]: plan.svg } };
