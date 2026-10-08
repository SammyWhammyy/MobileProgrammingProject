import { describe, expect, it } from 'vitest';

import { defineSnapshot, type EdgeSpec } from './authoring';
import { hamkC2 } from './data/hamkC2';
import { testBuilding } from './data/testBuilding';
import { listPlaces, searchPlaces } from './places';
import { planRoute } from './route';
import { turnAt } from './steps';
import type { Floor, MapNode, NodeType } from './types';

const building = { id: 'b', name: 'B', address: '', dataVersion: 1 };
const floor = (id: string, level: number): Floor => ({
  id,
  buildingId: 'b',
  level,
  name: `Floor ${level}`,
  svgUrl: '',
  widthM: 100,
  heightM: 100,
});
const node = (id: string, floorId: string, x: number, y: number, type: NodeType = 'corridor', label?: string): MapNode => ({
  id,
  floorId,
  x,
  y,
  type,
  label,
});

/** A 10 m square a-b-c-d with a long detour edge a-d removed, plus an isolated node. */
const square = defineSnapshot({
  building,
  floors: [floor('f1', 1)],
  nodes: [node('a', 'f1', 0, 0), node('b', 'f1', 10, 0), node('c', 'f1', 10, 10), node('d', 'f1', 0, 10), node('x', 'f1', 50, 50)],
  edges: [
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
  ],
  rooms: [],
});

/**
 * Two floors. Stairs right next to the start, elevator far away at x = 40.
 * Floor 1: s(0,0) - st1(5,0) - mid1(20,0) - el1(40,0)
 * Floor 2: st2(5,0) - mid2(20,0) - el2(40,0) - t(40,10)
 */
function twoFloors(withElevator: boolean) {
  const edges: EdgeSpec[] = [
    ['s', 'st1'],
    ['st1', 'mid1'],
    ['mid1', 'el1'],
    ['st2', 'mid2'],
    ['mid2', 'el2'],
    ['el2', 't'],
    ['st1', 'st2', 'stairs'],
  ];
  if (withElevator) edges.push(['el1', 'el2', 'elevator']);
  return defineSnapshot({
    building,
    floors: [floor('f1', 1), floor('f2', 2)],
    nodes: [
      node('s', 'f1', 0, 0),
      node('st1', 'f1', 5, 0, 'stairs', 'Stairs A'),
      node('mid1', 'f1', 20, 0),
      node('el1', 'f1', 40, 0, 'elevator', 'Elevator'),
      node('st2', 'f2', 5, 0, 'stairs', 'Stairs A'),
      node('mid2', 'f2', 20, 0),
      node('el2', 'f2', 40, 0, 'elevator', 'Elevator'),
      node('t', 'f2', 40, 10, 'door'),
    ],
    edges,
    rooms: [],
  });
}

describe('A*', () => {
  it('finds the known shortest path', () => {
    const route = planRoute(square, 'a', 'd')!;
    expect(route.nodeIds).toEqual(['a', 'b', 'c', 'd']);
    expect(route.lengthM).toBeCloseTo(30);
  });

  it('returns null for an unreachable goal', () => {
    expect(planRoute(square, 'a', 'x')).toBeNull();
  });

  it('handles start equal to goal', () => {
    const route = planRoute(square, 'a', 'a')!;
    expect(route.nodeIds).toEqual(['a']);
    expect(route.lengthM).toBe(0);
    expect(route.steps.map((s) => s.kind)).toEqual(['arrive']);
  });

  it('uses the stairs in fastest mode', () => {
    const route = planRoute(twoFloors(true), 's', 't')!;
    expect(route.nodeIds).toContain('st2');
    expect(route.lengthM).toBeCloseTo(5 + 15 + 35 + 10);
  });

  it('uses the elevator in accessible mode even when it is longer', () => {
    const route = planRoute(twoFloors(true), 's', 't', 'accessible')!;
    expect(route.nodeIds).toEqual(['s', 'st1', 'mid1', 'el1', 'el2', 't']);
    expect(route.lengthM).toBeCloseTo(40 + 30 + 10);
  });

  it('finds no accessible route when there is no elevator', () => {
    expect(planRoute(twoFloors(false), 's', 't', 'accessible')).toBeNull();
    expect(planRoute(twoFloors(false), 's', 't')).not.toBeNull();
  });

  it('routes 1 000 nodes in under 100 ms', () => {
    const size = 32;
    const nodes: MapNode[] = [];
    const edges: EdgeSpec[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        nodes.push(node(`${x}:${y}`, 'f1', x * 3, y * 3));
        if (x > 0) edges.push([`${x - 1}:${y}`, `${x}:${y}`]);
        if (y > 0) edges.push([`${x}:${y - 1}`, `${x}:${y}`]);
      }
    }
    const grid = defineSnapshot({ building, floors: [floor('f1', 1)], nodes, edges, rooms: [] });
    planRoute(grid, '0:0', '1:1');
    const started = Date.now();
    const route = planRoute(grid, '0:0', `${size - 1}:${size - 1}`)!;
    expect(Date.now() - started).toBeLessThan(100);
    expect(route.lengthM).toBeCloseTo((size - 1) * 2 * 3);
  });
});

describe('segments and steps', () => {
  it('splits a two-floor route into two segments', () => {
    const route = planRoute(twoFloors(true), 's', 't')!;
    expect(route.segments.map((s) => s.floorId)).toEqual(['f1', 'f2']);
    expect(route.segments[0].nodeIds).toEqual(['s', 'st1']);
  });

  it('produces straight runs, a floor change, a turn and arrival', () => {
    const route = planRoute(twoFloors(true), 's', 't')!;
    expect(route.steps).toEqual([
      { kind: 'straight', floorId: 'f1', nodeId: 's', distanceM: 5 },
      { kind: 'changeFloor', floorId: 'f1', nodeId: 'st1', via: 'stairs', toFloorId: 'f2', toLevel: 2, up: true, label: 'Stairs A' },
      { kind: 'straight', floorId: 'f2', nodeId: 'st2', distanceM: 35 },
      { kind: 'turn', floorId: 'f2', nodeId: 'el2', direction: 'right' },
      { kind: 'straight', floorId: 'f2', nodeId: 'el2', distanceM: 10 },
      { kind: 'arrive', floorId: 'f2', nodeId: 't' },
    ]);
  });

  it('classifies turns with y pointing down', () => {
    const p = (x: number, y: number) => node('p', 'f1', x, y);
    expect(turnAt(p(0, 0), p(10, 0), p(20, 1))).toBe('straight');
    expect(turnAt(p(0, 0), p(10, 0), p(10, 10))).toBe('right');
    expect(turnAt(p(0, 0), p(10, 0), p(10, -10))).toBe('left');
    expect(turnAt(p(0, 0), p(10, 0), p(0, 0.5))).toBe('back');
  });
});

describe('HAMK building C, floor 2', () => {
  const { snapshot } = hamkC2;

  it('connects every room to the main corridor', () => {
    for (const room of snapshot.rooms) {
      expect(planRoute(snapshot, 'c2-main', room.doorNodeId), room.code).not.toBeNull();
    }
  });

  it('turns left into C206A', () => {
    const route = planRoute(snapshot, 'c2-main', 'd-C206A')!;
    expect(route.steps.map((s) => s.kind)).toEqual(['straight', 'turn', 'straight', 'arrive']);
    expect(route.steps[1]).toMatchObject({ kind: 'turn', direction: 'left' });
  });

  it('keeps door nodes inside the floor', () => {
    const floor = snapshot.floors[0];
    for (const n of snapshot.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(floor.widthM);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeLessThanOrEqual(floor.heightM);
    }
  });
});

describe('test building', () => {
  const { snapshot } = testBuilding;

  it('connects every room to the main entrance', () => {
    for (const room of snapshot.rooms) {
      expect(planRoute(snapshot, 'entrance', room.doorNodeId), room.code).not.toBeNull();
    }
  });

  it('turns right from the main corridor towards the library', () => {
    const route = planRoute(snapshot, 'entrance', 'd-L101')!;
    expect(route.steps.filter((s) => s.kind === 'turn')).toEqual([
      { kind: 'turn', floorId: 'f1', nodeId: 'corner', direction: 'right' },
    ]);
  });

  it('searches rooms by code, name and tag', () => {
    const places = listPlaces(snapshot);
    expect(searchPlaces(snapshot, places, 'a10').length).toBeGreaterThan(5);
    expect(searchPlaces(snapshot, places, 'library').map((p) => p.title)).toEqual(['L101']);
    expect(searchPlaces(snapshot, places, 'COFFEE').map((p) => p.title)).toEqual(['C101']);
    expect(searchPlaces(snapshot, places, 'stairs').map((p) => p.title)).toEqual(['Stairs B']);
  });
});
