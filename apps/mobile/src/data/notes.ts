import { createNotesRepository, initializeNotes } from '@campus/map';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

// Keep one initialized connection. Notes never participate in map reseeding.
let pending: Promise<SQLiteDatabase> | undefined;
async function openNotesDatabase(): Promise<SQLiteDatabase> {
  return pending ??= (async () => {
    const db = await openDatabaseAsync('campus-notes.db');
    try {
      await initializeNotes(db);
      return db;
    } catch (error) {
      await db.closeAsync();
      throw error;
    }
  })().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
}

export async function getNotesRepository(roomIds: readonly string[]) {
  return createNotesRepository(await openNotesDatabase(), roomIds);
}
