import { describe, expect, it } from 'vitest';
import { buildingC, buildingCFloorTraces } from './data/buildingC';
import { buildGraph } from './graph';
import { listPlaces, searchPlaces } from './places';
import { planRoute } from './route';
import { assertMapBundle } from './validate';

describe('Building C map integrity and navigation', () => {
  const { snapshot } = buildingC;
  it('contains exactly the three agreed floors with valid assets and graph references', () => {
    expect(snapshot.floors.map((floor) => floor.level)).toEqual([1, 2, 3]);
    expect(() => assertMapBundle(buildingC)).not.toThrow();
    expect(snapshot.rooms.every((room) => !/^S\d/.test(room.code))).toBe(true);
  });

  it('connects every room in both directions and agrees with an independent shortest path calculation', () => {
    // Floyd-Warshall is independent of the production heap-based path search.
    const graph = buildGraph(snapshot);
    const ids = [...graph.nodes.keys()];
    const index = new Map(ids.map((id, i) => [id, i]));
    const distances = ids.map((_, i) => ids.map((__, j) => i === j ? 0 : Infinity));
    for (const edge of snapshot.edges) {
      const a = index.get(edge.fromNodeId)!;
      const b = index.get(edge.toNodeId)!;
      distances[a][b] = distances[b][a] = Math.min(distances[a][b], edge.weight);
    }
    for (let k = 0; k < ids.length; k++) for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) {
      distances[i][j] = Math.min(distances[i][j], distances[i][k] + distances[k][j]);
    }
    for (const from of snapshot.rooms) for (const to of snapshot.rooms) {
      const route = planRoute(snapshot, from.doorNodeId, to.doorNodeId);
      expect(route, `${from.code} -> ${to.code}`).not.toBeNull();
      expect(route!.lengthM).toBeCloseTo(distances[index.get(from.doorNodeId)!][index.get(to.doorNodeId)!], 7);
      expect(route!.nodeIds[0]).toBe(from.doorNodeId);
      expect(route!.nodeIds.at(-1)).toBe(to.doorNodeId);
      if (from.floorId === to.floorId) expect(route!.segments.every((segment) => segment.floorId === from.floorId)).toBe(true);
    }
  });

  it('supports all floor pairs with ordered transitions and arrival', () => {
    for (const from of snapshot.floors) for (const to of snapshot.floors) {
      if (from.id === to.id) continue;
      const route = planRoute(snapshot, `${from.id}-stairs-north`, `${to.id}-stairs-south`)!;
      expect(route.segments[0].floorId).toBe(from.id);
      expect(route.segments.at(-1)!.floorId).toBe(to.id);
      expect(route.steps.filter((step) => step.kind === 'changeFloor')).toHaveLength(Math.abs(from.level - to.level));
      expect(route.steps.at(-1)!.kind).toBe('arrive');
    }
  });

  it('keeps walk edges orthogonal and outside rectangular room interiors', () => {
    const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]));
    for (const edge of snapshot.edges.filter((item) => item.kind === 'walk')) {
      const a = nodes.get(edge.fromNodeId)!;
      const b = nodes.get(edge.toNodeId)!;
      expect(a.x === b.x || a.y === b.y, `Diagonal edge ${a.id} -> ${b.id}`).toBe(true);
      const trace = buildingCFloorTraces.find((floor) => `c${floor.level}` === a.floorId)!;
      for (let fraction = 0.1; fraction < 1; fraction += 0.1) {
        const x = a.x + (b.x - a.x) * fraction;
        const y = a.y + (b.y - a.y) * fraction;
        const blockedSpaces = [
          ...trace.rooms.filter((item) => !item.path),
          ...(trace.otherSpaces ?? []).map((rect) => ({ code: 'unlabelled space', rect })),
        ];
        for (const room of blockedSpaces) {
          const [rx, ry, width, height] = room.rect;
          expect(x > rx && x < rx + width && y > ry && y < ry + height,
            `${a.id} -> ${b.id} crosses ${room.code}`).toBe(false);
        }
      }
    }
  });

  it('searches combined room numbers without creating unverified doors', () => {
    const places = listPlaces(snapshot);
    expect(searchPlaces(snapshot, places, 'c305').some((place) => place.title.includes('C304-305'))).toBe(true);
    expect(snapshot.rooms.some((room) => room.code === 'C323')).toBe(false);
    expect(planRoute(snapshot, 'missing', snapshot.nodes[0].id)).toBeNull();
    expect(planRoute(snapshot, 'c1-stairs-north', 'c3-stairs-north', 'accessible')).toBeNull();
  });

  it('rejects duplicate identifiers, broken doors, invalid bounds and edge weights', () => {
    const duplicate = structuredClone(buildingC);
    duplicate.snapshot.nodes.push(duplicate.snapshot.nodes[0]);
    expect(() => assertMapBundle(duplicate)).toThrow(/IDs/);
    const brokenDoor = structuredClone(buildingC);
    brokenDoor.snapshot.rooms[0].doorNodeId = 'missing';
    expect(() => assertMapBundle(brokenDoor)).toThrow(/room/);
    const invalidNode = structuredClone(buildingC);
    invalidNode.snapshot.nodes[0].x = -1;
    expect(() => assertMapBundle(invalidNode)).toThrow(/node/);
    const invalidWeight = structuredClone(buildingC);
    invalidWeight.snapshot.edges[0].weight = NaN;
    expect(() => assertMapBundle(invalidWeight)).toThrow(/edge/);
  });
});
