import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createNotesRepository, initializeNotes, type NotesDatabase } from './notes';

function adapter(native: DatabaseSync): NotesDatabase {
  return {
    async execAsync(sql) { native.exec(sql); },
    async runAsync(sql, ...params) {
      const result = native.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) {
      return native.prepare(sql).all(...params) as T[];
    },
  };
}

const input = { roomId: 'c102', title: 'Bring an adapter', body: 'Check the projector before the presentation.' };

describe('room note CRUD in real SQLite', () => {
  it('creates, reads, updates and deletes the same persisted record', async () => {
    const native = new DatabaseSync(':memory:');
    try {
      const db = adapter(native);
      await initializeNotes(db);
      const repo = createNotesRepository(db, ['c102', 'c339']);
      const id = await repo.create(input);
      const first = await repo.get(id);
      expect(first).toMatchObject({ ...input, id });
      expect(await repo.list()).toHaveLength(1);
      await repo.update(id, { roomId: 'c339', title: 'Updated reminder', body: 'Bring a laptop instead.' });
      expect(await repo.get(id)).toMatchObject({ id, roomId: 'c339', title: 'Updated reminder', createdAt: first!.createdAt });
      expect((await repo.get(id))!.updatedAt).toBeGreaterThanOrEqual(first!.updatedAt);
      await repo.remove(id);
      expect(await repo.get(id)).toBeNull();
      expect(await repo.list()).toEqual([]);
    } finally { native.close(); }
  });

  it('preserves notes across database reopen and repeat initialization', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'campus-notes-'));
    const file = join(directory, 'notes.db');
    let native = new DatabaseSync(file);
    try {
      await initializeNotes(adapter(native));
      const id = await createNotesRepository(adapter(native), ['c102']).create(input);
      native.close(); native = new DatabaseSync(file);
      await initializeNotes(adapter(native));
      expect(await createNotesRepository(adapter(native), ['c102']).get(id)).toMatchObject(input);
    } finally { native.close(); rmSync(directory, { recursive: true, force: true }); }
  });

  it('binds quotes and SQL-looking text as values and trims input', async () => {
    const native = new DatabaseSync(':memory:');
    try {
      await initializeNotes(adapter(native));
      const repo = createNotesRepository(adapter(native), ['c102']);
      const body = "Sam's adapter'); DROP TABLE room_notes; --";
      const id = await repo.create({ ...input, title: '  Reminder  ', body });
      expect(await repo.get(id)).toMatchObject({ title: 'Reminder', body });
      expect(await repo.list()).toHaveLength(1);
    } finally { native.close(); }
  });

  it('rejects blank, oversized and unknown-room writes without changing saved content', async () => {
    const native = new DatabaseSync(':memory:');
    try {
      await initializeNotes(adapter(native));
      const repo = createNotesRepository(adapter(native), ['c102']);
      const id = await repo.create(input);
      for (const invalid of [
        { ...input, title: '   ' }, { ...input, body: '\n ' },
        { ...input, title: 'x'.repeat(81) }, { ...input, body: 'x'.repeat(2001) },
        { ...input, roomId: 'unknown' },
      ]) {
        await expect(repo.create(invalid)).rejects.toThrow();
        await expect(repo.update(id, invalid)).rejects.toThrow();
      }
      expect(await repo.list()).toHaveLength(1);
      expect(await repo.get(id)).toMatchObject(input);
    } finally { native.close(); }
  });

  it('reports missing records and invalid IDs instead of pretending to update', async () => {
    const native = new DatabaseSync(':memory:');
    try {
      await initializeNotes(adapter(native));
      const repo = createNotesRepository(adapter(native), ['c102']);
      await expect(repo.update(999, input)).rejects.toThrow('no longer exists');
      await expect(repo.remove(999)).rejects.toThrow('no longer exists');
      for (const id of [0, -1, NaN, 1.5]) {
        await expect(repo.get(id)).rejects.toThrow('Invalid note ID');
        await expect(repo.update(id, input)).rejects.toThrow('Invalid note ID');
        await expect(repo.remove(id)).rejects.toThrow('Invalid note ID');
      }
    } finally { native.close(); }
  });

  it('keeps old notes readable and deletable if a room disappears from the catalogue', async () => {
    const native = new DatabaseSync(':memory:');
    try {
      await initializeNotes(adapter(native));
      const id = await createNotesRepository(adapter(native), ['c102']).create(input);
      const revised = createNotesRepository(adapter(native), ['c339']);
      expect(await revised.get(id)).toMatchObject(input);
      await expect(revised.update(id, input)).rejects.toThrow('available room');
      await revised.update(id, { ...input, roomId: 'c339' });
      expect((await revised.get(id))!.roomId).toBe('c339');
      await revised.remove(id);
      expect(await revised.list()).toEqual([]);
    } finally { native.close(); }
  });
});
