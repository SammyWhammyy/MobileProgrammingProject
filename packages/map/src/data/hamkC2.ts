import { defineSnapshot, type EdgeSpec } from '../authoring';
import type { MapBundle, MapNode } from '../types';
import { doorNodeId, rectPlan, type RectRoomSpec } from './rectPlan';

/**
 * HAMK Visamäki, building C, 2nd floor: the east wing with rooms C205–C216.
 * Traced from the evacuation plan; scale from C206A being 5.5 m wide (about 15.3 px/m on the photo).
 *
 * The wing is one corridor along y = 14.4 running east from the junction with the main corridor (x = 1)
 * to the landing in front of C208 and the exit stairs. C205, C206A and C206B open onto it through gaps
 * between the closets on its north side.
 */

const FLOOR_ID = 'c2';
const WIDTH_M = 27.5;
const HEIGHT_M = 20.5;
const CORRIDOR_Y = 14.4;
const DOOR_ROW_Y = 12.3;

const ROOMS: RectRoomSpec[] = [
  { code: 'C205', name: 'Classroom', category: 'classroom', rect: [1, 1, 8.3, 10.2], door: [2.5, DOOR_ROW_Y] },
  { code: 'C206A', name: 'Classroom', category: 'classroom', rect: [9.3, 1, 5.5, 10.2], door: [11.25, DOOR_ROW_Y] },
  { code: 'C206B', name: 'Classroom', category: 'classroom', rect: [14.8, 1, 6.8, 10.2], door: [20.3, DOOR_ROW_Y] },
  { code: 'C208', name: 'Classroom', category: 'classroom', rect: [21.6, 7.6, 4.6, 5.8], door: [22.6, CORRIDOR_Y] },
  { code: 'C216', name: 'Classroom', category: 'classroom', rect: [1.5, 15.3, 12.7, 4], door: [8, CORRIDOR_Y] },
  { code: 'C215', name: 'Classroom', category: 'classroom', rect: [14.2, 15.3, 2.7, 4], door: [15.5, CORRIDOR_Y] },
  { code: 'C214', name: 'Classroom', category: 'classroom', rect: [16.9, 15.3, 3.9, 4], door: [18.4, CORRIDOR_Y] },
];

const plan = rectPlan({
  floorId: FLOOR_ID,
  widthM: WIDTH_M,
  heightM: HEIGHT_M,
  rooms: ROOMS,
  spaces: [
    { id: 'closets-west', rect: [4, 11.2, 6.5, 2.2] },
    { id: 'closets-east', rect: [12, 11.2, 7.3, 2.2] },
    { id: 'stairs-exit', rect: [21.6, 15.3, 4.6, 4] },
  ],
  walls: [
    // West side of the open area in front of C205.
    'M1 11.2V13.4',
    // Corridor end: wall between C214 and the exit stairs.
    'M20.8 15.3V19.3',
  ],
});

const nodes: MapNode[] = [
  { id: 'c2-main', floorId: FLOOR_ID, x: 1, y: CORRIDOR_Y, type: 'entrance', label: 'Main corridor (wing C)' },
  { id: 'c2-j205', floorId: FLOOR_ID, x: 2.5, y: CORRIDOR_Y, type: 'corridor' },
  { id: 'c2-j206a', floorId: FLOOR_ID, x: 11.25, y: CORRIDOR_Y, type: 'corridor' },
  { id: 'c2-j206b', floorId: FLOOR_ID, x: 20.3, y: CORRIDOR_Y, type: 'corridor' },
  { id: 'c2-stairs', floorId: FLOOR_ID, x: 23.9, y: 16.8, type: 'stairs', label: 'Exit stairs' },
  ...plan.doorNodes,
];

const d = doorNodeId;
const corridor = ['c2-main', 'c2-j205', d('C216'), 'c2-j206a', d('C215'), d('C214'), 'c2-j206b', d('C208')];

const edges: EdgeSpec[] = [
  ...corridor.slice(1).map((id, i): EdgeSpec => [corridor[i], id]),
  ['c2-j205', d('C205')],
  ['c2-j206a', d('C206A')],
  ['c2-j206b', d('C206B')],
  [d('C208'), 'c2-stairs'],
];

const snapshot = defineSnapshot({
  building: {
    id: 'hamk-visamaki-c',
    name: 'HAMK Visamäki, building C',
    address: 'Vankanlähde 9, 13100 Hämeenlinna',
    dataVersion: 1,
  },
  floors: [
    {
      id: FLOOR_ID,
      buildingId: 'hamk-visamaki-c',
      level: 2,
      name: 'Floor 2',
      svgUrl: '',
      widthM: WIDTH_M,
      heightM: HEIGHT_M,
    },
  ],
  nodes,
  edges,
  rooms: plan.rooms,
});

export const hamkC2: MapBundle = { snapshot, svgByFloor: { [FLOOR_ID]: plan.svg } };
