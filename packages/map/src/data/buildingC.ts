import { defineSnapshot, type EdgeSpec } from '../authoring';
import type { MapBundle, MapNode, Room } from '../types';
import { PLAN_ROOM_COLOR, PLAN_WALL_COLOR } from './planColors';

type Point = readonly [x: number, y: number];
type Rect = readonly [x: number, y: number, width: number, height: number];
interface TracedRoom {
  code: string;
  rect: Rect;
  door: Point;
  approach: Point;
  name?: string;
  path?: string;
  label?: Point;
}
interface FloorTrace {
  level: number;
  width: number;
  height: number;
  corridorAreas: string[];
  centerlines: Point[][];
  northStairs: Rect;
  southStairs: Rect;
  lift: Rect;
  entrance?: Point;
  rooms: TracedRoom[];
  otherSpaces?: Rect[];
}

const corridorColor = '#203D38';
const spaceColor = PLAN_ROOM_COLOR;
const rectanglePath = ([x, y, w, h]: Rect) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`;

/** Floor-specific orthogonal traces of the supplied photographs.
 * The x origin is approximately 200 photo pixels from the left edge. Perspective
 * is removed by aligning parallel walls; coordinates are drawing units, not meters.
 * Door positions are explicit. Nothing is projected onto an arbitrary shared grid.
 */
export const buildingCFloorTraces: FloorTrace[] = [
  {
    level: 1, width: 900, height: 890,
    corridorAreas: [
      'M320 145H480V850H330V790Q405 770 400 650Q400 490 320 400Z',
      rectanglePath([440, 145, 285, 35]),
      rectanglePath([695, 175, 30, 340]),
      rectanglePath([440, 480, 285, 35]),
      rectanglePath([480, 180, 80, 100]),
      rectanglePath([480, 605, 80, 70]),
      rectanglePath([725, 180, 135, 100]),
    ],
    centerlines: [
      [[440, 160], [710, 160], [710, 500], [440, 500], [440, 160]],
      [[440, 500], [440, 850]],
      [[520, 160], [520, 105]],
      [[440, 635], [520, 635]],
    ],
    northStairs: [480, 65, 80, 80], southStairs: [480, 605, 80, 60],
    lift: [480, 180, 35, 40], entrance: [440, 850],
    rooms: [
      { code: 'C104', name: 'Auditorium C', rect: [55, 300, 265, 245],
        path: 'M320 400Q230 280 135 310Q30 340 55 545Z', label: [170, 405], door: [320, 400], approach: [440, 400] },
      { code: 'C103', name: 'Auditorium B', rect: [55, 400, 345, 255],
        path: 'M55 545L320 400Q385 490 400 655H130Q85 615 55 545Z', label: [245, 560], door: [393, 580], approach: [440, 580] },
      { code: 'C102', name: 'Auditorium A', rect: [130, 655, 270, 135],
        path: 'M130 655H400V715Q380 795 285 790Q175 780 130 715Z', label: [275, 710], door: [400, 700], approach: [440, 700] },
      { code: 'IT-HELP', name: 'IT Helpdesk', rect: [480, 280, 80, 140], door: [480, 365], approach: [440, 365] },
      { code: 'C130', rect: [560, 240, 135, 240], door: [605, 480], approach: [605, 500] },
      { code: 'C146', rect: [725, 280, 135, 325], door: [725, 400], approach: [710, 400] },
      { code: 'STUDY', name: 'Study Services', rect: [480, 515, 160, 90], door: [480, 560], approach: [440, 560] },
      { code: 'C148', rect: [640, 515, 60, 90], door: [670, 515], approach: [670, 500] },
      { code: 'MOBILITY', name: 'International Mobility Services', rect: [480, 675, 65, 85], door: [480, 720], approach: [440, 720] },
      { code: 'CAREER', name: 'Career Services', rect: [480, 760, 65, 90], door: [480, 805], approach: [440, 805] },
    ],
    otherSpaces: [[480, 420, 80, 60], [240, 220, 75, 70], [270, 180, 45, 40]],
  },
  {
    level: 2, width: 850, height: 900,
    corridorAreas: [
      rectanglePath([80, 240, 700, 30]),
      rectanglePath([445, 260, 30, 295]),
      rectanglePath([665, 260, 30, 295]),
      rectanglePath([405, 520, 290, 35]),
      'M330 440H405V520H475V680H410V665H330Z',
      rectanglePath([475, 640, 75, 40]),
    ],
    centerlines: [
      [[90, 250], [765, 250]],
      [[450, 250], [450, 660], [510, 660]],
      [[680, 250], [680, 540], [450, 540]],
      [[510, 250], [510, 200]],
    ],
    northStairs: [475, 165, 70, 70], southStairs: [475, 640, 70, 40], lift: [475, 275, 30, 35],
    rooms: [
      { code: 'C206', rect: [80, 305, 180, 145], door: [90, 305], approach: [90, 250] },
      { code: 'C205', rect: [260, 305, 115, 145], door: [355, 305], approach: [355, 250] },
      { code: 'C222', rect: [475, 310, 190, 110], door: [475, 365], approach: [450, 365] },
      { code: 'C221', rect: [475, 420, 190, 100], door: [555, 520], approach: [555, 540] },
      { code: 'C236', rect: [695, 345, 110, 180], door: [695, 400], approach: [680, 400] },
      { code: 'C226', rect: [560, 160, 65, 70], door: [590, 230], approach: [590, 250] },
      { code: 'C227', rect: [625, 160, 45, 70], door: [647, 230], approach: [647, 250] },
      { code: 'C228', rect: [670, 160, 55, 70], door: [697, 230], approach: [697, 250] },
      { code: 'C229', rect: [725, 160, 55, 70], door: [765, 230], approach: [765, 250] },
      { code: 'C242', rect: [475, 555, 75, 80], door: [475, 610], approach: [450, 610] },
    ],
    otherSpaces: [[100, 270, 120, 35], [235, 270, 65, 35], [475, 270, 190, 40],
      [695, 270, 45, 75], [550, 555, 255, 80], [340, 680, 465, 200]],
  },
  {
    level: 3, width: 880, height: 950,
    corridorAreas: [
      rectanglePath([20, 210, 780, 30]),
      rectanglePath([425, 235, 30, 325]),
      rectanglePath([665, 235, 30, 325]),
      rectanglePath([380, 530, 395, 30]),
      'M300 430H380V530H455V700H385V625H300Z',
      rectanglePath([455, 655, 90, 45]),
      rectanglePath([385, 700, 70, 210]),
    ],
    centerlines: [
      [[40, 225], [775, 225]],
      [[440, 225], [440, 545], [420, 545], [420, 680], [500, 680]],
      [[680, 225], [680, 545], [440, 545]],
      [[680, 545], [750, 545]],
      [[500, 225], [500, 165]],
    ],
    northStairs: [455, 130, 90, 70], southStairs: [455, 655, 90, 50], lift: [455, 240, 35, 40],
    rooms: [
      { code: 'C304-305', name: 'Teaching Space', rect: [20, 275, 325, 165], door: [175, 275], approach: [175, 225] },
      { code: 'C316', rect: [165, 135, 40, 70], door: [185, 205], approach: [185, 225] },
      { code: 'C317', rect: [205, 135, 65, 70], door: [235, 205], approach: [235, 225] },
      { code: 'C318', rect: [270, 135, 65, 70], door: [315, 205], approach: [315, 225] },
      { code: 'C329', rect: [550, 130, 75, 70], door: [585, 200], approach: [585, 225] },
      { code: 'C330', rect: [625, 130, 50, 70], door: [650, 200], approach: [650, 225] },
      { code: 'C331', rect: [675, 130, 65, 70], door: [710, 200], approach: [710, 225] },
      { code: 'C327', rect: [585, 240, 80, 90], door: [665, 315], approach: [680, 315] },
      { code: 'C321', rect: [455, 335, 145, 65], door: [455, 365], approach: [440, 365] },
      { code: 'C324', rect: [600, 335, 65, 65], door: [665, 365], approach: [680, 365] },
      { code: 'C320', rect: [455, 405, 210, 125], door: [480, 530], approach: [480, 545] },
      { code: 'C338', rect: [695, 335, 150, 195], door: [695, 365], approach: [680, 365] },
      { code: 'C346', rect: [455, 565, 80, 90], door: [455, 635], approach: [420, 635] },
      { code: 'C341', rect: [595, 565, 40, 90], door: [615, 565], approach: [615, 545] },
      { code: 'C340', rect: [635, 565, 50, 90], door: [660, 565], approach: [660, 545] },
      { code: 'C339', rect: [685, 565, 150, 90], door: [750, 565], approach: [750, 545] },
    ],
    otherSpaces: [[125, 135, 40, 70], [455, 240, 130, 90], [535, 290, 45, 40],
      [535, 565, 60, 90], [695, 240, 75, 90], [300, 700, 85, 210], [455, 700, 90, 210]],
  },
];

const nodes: MapNode[] = [];
const rooms: Room[] = [];
const edges: EdgeSpec[] = [];
const svgByFloor: Record<string, string> = {};
const center = ([x, y, w, h]: Rect): Point => [x + w / 2, y + h / 2];
const keyOf = ([x, y]: Point) => `${x},${y}`;
const onSegment = ([x, y]: Point, [a, b]: readonly [Point, Point]) =>
  x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0])
  && y >= Math.min(a[1], b[1]) && y <= Math.max(a[1], b[1])
  && (a[0] === b[0] ? x === a[0] : y === a[1]);

for (const trace of buildingCFloorTraces) {
  const floorId = `c${trace.level}`;
  const points = new Map<string, { point: Point; id: string; type: MapNode['type']; label?: string }>();
  const addPoint = (point: Point, id = `${floorId}-p-${point[0]}-${point[1]}`, type: MapNode['type'] = 'corridor', label?: string) => {
    const key = keyOf(point);
    if (!points.has(key) || type !== 'corridor') points.set(key, { point, id, type, label });
  };
  addPoint(center(trace.northStairs), `${floorId}-stairs-north`, 'stairs', 'North stairs');
  addPoint(center(trace.southStairs), `${floorId}-stairs-south`, 'stairs', 'South stairs');
  if (trace.entrance) addPoint(trace.entrance, `${floorId}-entrance`, 'entrance', 'Building C entrance');
  const segments: [Point, Point][] = [];
  for (const line of trace.centerlines) for (let i = 1; i < line.length; i++) segments.push([line[i - 1], line[i]]);
  for (const room of trace.rooms) {
    addPoint(room.door, `door-${room.code}`, 'door');
    addPoint(room.approach);
    segments.push([room.approach, room.door]);
    const [x, y, w, h] = room.rect;
    const label = room.label ?? [x + w / 2, y + h / 2];
    rooms.push({ id: `room-${room.code}`, floorId, code: room.code, name: room.name ?? 'Room',
      category: room.name?.startsWith('Auditorium') ? 'classroom' : room.name ? 'service' : 'classroom',
      doorNodeId: `door-${room.code}`, tags: room.code === 'C304-305' ? ['C304', 'C305'] : [],
      labelAt: { x: label[0], y: label[1] }, labelSize: Math.min(17, (w - 8) / (room.code.length * 0.65)),
    });
  }
  for (const [a, b] of segments) {
    if (a[0] !== b[0] && a[1] !== b[1]) throw new Error(`Diagonal corridor on ${floorId}`);
    addPoint(a); addPoint(b);
  }
  // Every real crossing and room approach splits the corridor centerline, so a
  // door cannot create a diagonal shortcut through a wall or unrelated room.
  for (const [a, b] of segments) for (const [c, d] of segments) {
    if (a[0] === b[0] && c[1] === d[1]) {
      const crossing: Point = [a[0], c[1]];
      if (onSegment(crossing, [a, b]) && onSegment(crossing, [c, d])) addPoint(crossing);
    }
  }
  for (const item of points.values()) nodes.push({ id: item.id, floorId, x: item.point[0], y: item.point[1], type: item.type, label: item.label });
  const seenEdges = new Set<string>();
  for (const segment of segments) {
    const ordered = [...points.values()].filter((item) => onSegment(item.point, segment))
      .sort((a, b) => a.point[0] - b.point[0] || a.point[1] - b.point[1]);
    for (let i = 1; i < ordered.length; i++) {
      const a = ordered[i - 1].id; const b = ordered[i].id;
      const key = [a, b].sort().join('|');
      if (!seenEdges.has(key)) { edges.push([a, b]); seenEdges.add(key); }
    }
  }

  const rect = (box: Rect, fill = spaceColor) => `<path d="${rectanglePath(box)}" fill="${fill}" stroke="${PLAN_WALL_COLOR}" stroke-width="1.6"/>`;
  const stair = (box: Rect) => {
    const [x, y, w, h] = box;
    return rect(box) + Array.from({ length: 7 }, (_, i) => `<path d="M${x + 7} ${y + 7 + i * (h - 14) / 6}H${x + w - 7}" stroke="${PLAN_WALL_COLOR}" stroke-width="1.5"/>`).join('');
  };
  const doors = trace.rooms.map((room) => {
    const [x, y] = room.door;
    const horizontal = room.approach[0] === x;
    return `<path d="${horizontal ? `M${x - 7} ${y}H${x + 7}` : `M${x} ${y - 7}V${y + 7}`}" stroke="${corridorColor}" stroke-width="4"/>`;
  }).join('');
  const north = trace.northStairs; const south = trace.southStairs;
  svgByFloor[floorId] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${trace.width} ${trace.height}">
    ${trace.corridorAreas.map((path) => `<path d="${path}" fill="${corridorColor}"/>`).join('')}
    ${trace.rooms.map((room) => `<path d="M${room.approach[0]} ${room.approach[1]}L${room.door[0]} ${room.door[1]}" fill="none" stroke="${corridorColor}" stroke-width="16"/>`).join('')}
    ${(trace.otherSpaces ?? []).map((box) => rect(box)).join('')}
    ${trace.rooms.map((room) => room.path ? `<path d="${room.path}" fill="${spaceColor}" stroke="${PLAN_WALL_COLOR}" stroke-width="1.6"/>` : rect(room.rect)).join('')}
    ${rect(trace.lift)}
    ${stair(north)}${stair(south)}${doors}
    <g fill="${PLAN_WALL_COLOR}" font-size="12" font-family="sans-serif">
      <text x="${north[0] + north[2] / 2}" y="${north[1] - 10}" text-anchor="middle">North stairs</text>
      <text x="${south[0] - 12}" y="${south[1] + south[3] / 2}" text-anchor="end">South stairs</text>
      <text x="${trace.lift[0] + trace.lift[2] / 2}" y="${trace.lift[1] + trace.lift[3] / 2}" text-anchor="middle" font-size="9">Lift</text>
      ${trace.level === 3 ? '<text x="557" y="314" text-anchor="middle">C323</text><text x="565" y="610" text-anchor="middle">WC</text>' : ''}
      ${trace.level === 1 ? '<text x="275" y="260" text-anchor="middle">WC</text>' : ''}
      ${trace.level === 2 ? '<text x="267" y="292" text-anchor="middle">WC</text>' : ''}
    </g>
  </svg>`;
}

for (const connector of ['stairs-north', 'stairs-south']) for (const level of [1, 2]) {
  edges.push([`c${level}-${connector}`, `c${level + 1}-${connector}`, 'stairs']);
}

/** Photo-based geometry with explicit corridors and room entrances. */
const snapshot = defineSnapshot({
    building: { id: 'hamk-c', name: 'HAMK Building C', address: 'Visamäki', dataVersion: 2 },
    floors: buildingCFloorTraces.map((floor) => ({ id: `c${floor.level}`, buildingId: 'hamk-c', level: floor.level,
      name: `Floor ${floor.level}`, svgUrl: '', widthM: floor.width, heightM: floor.height, coordinateUnit: 'drawing' as const })),
    nodes, edges, rooms,
});
// Original fixtures use meter-sized drawings; these traces use photo-sized units.
// Scale transfer costs accordingly so stairs cannot become a cheap same-floor shortcut.
for (const edge of snapshot.edges) if (edge.kind === 'stairs') edge.weight *= 20;
export const buildingC: MapBundle = { snapshot, svgByFloor };
