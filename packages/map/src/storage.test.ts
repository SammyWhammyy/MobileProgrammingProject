import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildingC } from './data/buildingC';
import { loadStoredMap, type MapDatabase } from './storage';

/** Exercises the production SQL with a real SQLite engine, not canned results. */
function adapter(native: DatabaseSync, failWrites = false): MapDatabase {
  const db: MapDatabase = {
    async execAsync(sql) { native.exec(sql); },
    async runAsync(sql, ...params) {
      if (failWrites && sql.startsWith('INSERT INTO map_edges')) throw new Error('Simulated interrupted update');
      return native.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string) { return native.prepare(sql).all() as T[]; },
    async withExclusiveTransactionAsync(task) {
      native.exec('BEGIN IMMEDIATE');
      try { await task(db); native.exec('COMMIT'); }
      catch (error) { native.exec('ROLLBACK'); throw error; }
    },
  };
  return db;
}

describe('local map persistence', () => {
  it('seeds all map tables and survives closing and reopening the database', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'campus-map-'));
    const path = join(directory, 'map.db');
    let native = new DatabaseSync(path);
    try {
      expect(await loadStoredMap(adapter(native), buildingC)).toEqual(buildingC);
      native.close();
      native = new DatabaseSync(path);
      expect(await loadStoredMap(adapter(native), buildingC)).toEqual(buildingC);
      expect(native.prepare('SELECT COUNT(*) AS count FROM map_floors').get()!.count).toBe(3);
    } finally {
      native.close();
      for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
      rmdirSync(directory);
    }
  });

  it('rolls back an interrupted replacement without losing the previous map', async () => {
    const native = new DatabaseSync(':memory:');
    try {
      await loadStoredMap(adapter(native), buildingC);
      const changed = structuredClone(buildingC);
      changed.snapshot.building.dataVersion++;
      await expect(loadStoredMap(adapter(native, true), changed)).rejects.toThrow('interrupted');
      expect(await loadStoredMap(adapter(native), buildingC)).toEqual(buildingC);
    } finally { native.close(); }
  });

  it('replaces changed bundled data atomically and rejects corrupt input', async () => {
    const native = new DatabaseSync(':memory:');
    try {
      await loadStoredMap(adapter(native), buildingC);
      const changed = structuredClone(buildingC);
      changed.snapshot.rooms[0].name = 'Updated auditorium name';
      expect(await loadStoredMap(adapter(native), changed)).toEqual(changed);
      const broken = structuredClone(changed);
      broken.snapshot.rooms[0].doorNodeId = 'unknown';
      await expect(loadStoredMap(adapter(native), broken)).rejects.toThrow('room');
      expect(await loadStoredMap(adapter(native), changed)).toEqual(changed);
    } finally { native.close(); }
  });
});
