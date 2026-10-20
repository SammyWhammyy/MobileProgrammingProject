import type { Building, Edge, Floor, MapBundle, MapNode, Room } from './types';
import { assertMapBundle } from './validate';

/** Minimal async SQLite interface implemented by Expo SQLite on Android. */
export interface MapDatabase {
  execAsync(sql: string): Promise<unknown>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  withExclusiveTransactionAsync(task: (transaction: MapDatabase) => Promise<void>): Promise<void>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS map_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS map_floors (id TEXT PRIMARY KEY, payload TEXT NOT NULL, svg TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS map_nodes (
  id TEXT PRIMARY KEY, floor_id TEXT NOT NULL REFERENCES map_floors(id), payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS map_edges (
  id TEXT PRIMARY KEY, from_id TEXT NOT NULL REFERENCES map_nodes(id),
  to_id TEXT NOT NULL REFERENCES map_nodes(id), payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS map_rooms (
  id TEXT PRIMARY KEY, floor_id TEXT NOT NULL REFERENCES map_floors(id),
  door_id TEXT NOT NULL REFERENCES map_nodes(id), payload TEXT NOT NULL
);`;

/** Seeds atomically when bundled data changes, then reads the map from SQLite.
 * JSON payloads preserve domain types; indexed IDs enforce references.
 * No user data is stored in these replaceable map tables.
 */
export async function loadStoredMap(db: MapDatabase, seed: MapBundle): Promise<MapBundle> {
  assertMapBundle(seed);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA);
  // The canonical seed is the revision token, avoiding stale assets if a manual
  // dataVersion bump is forgotten. This is small for the three-floor MVP.
  const revision = JSON.stringify(seed);
  const meta = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM map_meta');
  if (meta.find((row) => row.key === 'revision')?.value !== revision) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync('DELETE FROM map_rooms; DELETE FROM map_edges; DELETE FROM map_nodes; DELETE FROM map_floors; DELETE FROM map_meta;');
      for (const floor of seed.snapshot.floors) {
        const svg = seed.svgByFloor[floor.id];
        if (!svg) throw new Error(`Missing floor asset: ${floor.id}`);
        await tx.runAsync('INSERT INTO map_floors (id, payload, svg) VALUES (?, ?, ?)', floor.id, JSON.stringify(floor), svg);
      }
      for (const node of seed.snapshot.nodes) {
        await tx.runAsync('INSERT INTO map_nodes (id, floor_id, payload) VALUES (?, ?, ?)', node.id, node.floorId, JSON.stringify(node));
      }
      for (const edge of seed.snapshot.edges) {
        await tx.runAsync('INSERT INTO map_edges (id, from_id, to_id, payload) VALUES (?, ?, ?, ?)', edge.id, edge.fromNodeId, edge.toNodeId, JSON.stringify(edge));
      }
      for (const room of seed.snapshot.rooms) {
        await tx.runAsync('INSERT INTO map_rooms (id, floor_id, door_id, payload) VALUES (?, ?, ?, ?)', room.id, room.floorId, room.doorNodeId, JSON.stringify(room));
      }
      await tx.runAsync('INSERT INTO map_meta (key, value) VALUES (?, ?)', 'building', JSON.stringify(seed.snapshot.building));
      await tx.runAsync('INSERT INTO map_meta (key, value) VALUES (?, ?)', 'revision', revision);
    });
  }
  const buildingRows = await db.getAllAsync<{ value: string }>("SELECT value FROM map_meta WHERE key = 'building'");
  if (buildingRows.length !== 1) throw new Error('Local map metadata is missing');
  const floors = await db.getAllAsync<{ id: string; payload: string; svg: string }>('SELECT id, payload, svg FROM map_floors ORDER BY rowid');
  const readPayloads = async <T>(table: 'map_nodes' | 'map_edges' | 'map_rooms'): Promise<T[]> =>
    (await db.getAllAsync<{ payload: string }>(`SELECT payload FROM ${table} ORDER BY rowid`)).map((row) => JSON.parse(row.payload) as T);
  const bundle: MapBundle = {
    snapshot: {
      building: JSON.parse(buildingRows[0].value) as Building,
      floors: floors.map((row) => JSON.parse(row.payload) as Floor),
      nodes: await readPayloads<MapNode>('map_nodes'),
      edges: await readPayloads<Edge>('map_edges'),
      rooms: await readPayloads<Room>('map_rooms'),
    },
    svgByFloor: Object.fromEntries(floors.map((row) => [row.id, row.svg])),
  };
  assertMapBundle(bundle);
  return bundle;
}
