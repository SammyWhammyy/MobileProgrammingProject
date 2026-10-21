/** User notes are separate from replaceable map data and survive map updates. */
export interface RoomNote {
  id: number;
  roomId: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export type NoteInput = Pick<RoomNote, 'roomId' | 'title' | 'body'>;

export interface NotesDatabase {
  execAsync(sql: string): Promise<unknown>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
}

export const NOTE_TITLE_LIMIT = 80;
export const NOTE_BODY_LIMIT = 2000;

export async function initializeNotes(db: NotesDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS room_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roomId TEXT NOT NULL,
      title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 80),
      body TEXT NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 2000),
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );`);
}

/** The room catalogue validates writes without coupling notes to seed replacement. */
export function createNotesRepository(db: NotesDatabase, roomIds: readonly string[]) {
  const rooms = new Set(roomIds);
  function validate(input: NoteInput): NoteInput {
    if (!rooms.has(input.roomId)) throw new Error('Choose an available room.');
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title || title.length > NOTE_TITLE_LIMIT) throw new Error('Enter a title of 1 to 80 characters.');
    if (!body || body.length > NOTE_BODY_LIMIT) throw new Error('Enter a note of 1 to 2000 characters.');
    return { roomId: input.roomId, title, body };
  }
  function validateId(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid note ID.');
  }
  return {
    async list(): Promise<RoomNote[]> {
      return db.getAllAsync<RoomNote>('SELECT * FROM room_notes ORDER BY updatedAt DESC, id DESC');
    },
    async get(id: number): Promise<RoomNote | null> {
      validateId(id);
      const rows = await db.getAllAsync<RoomNote>('SELECT * FROM room_notes WHERE id = ?', id);
      return rows[0] ?? null;
    },
    async create(input: NoteInput): Promise<number> {
      const value = validate(input);
      const now = Date.now();
      const result = await db.runAsync(
        'INSERT INTO room_notes (roomId, title, body, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        value.roomId, value.title, value.body, now, now,
      );
      return result.lastInsertRowId;
    },
    async update(id: number, input: NoteInput): Promise<void> {
      validateId(id);
      const value = validate(input);
      const result = await db.runAsync(
        'UPDATE room_notes SET roomId = ?, title = ?, body = ?, updatedAt = ? WHERE id = ?',
        value.roomId, value.title, value.body, Date.now(), id,
      );
      if (result.changes !== 1) throw new Error('This note no longer exists.');
    },
    async remove(id: number): Promise<void> {
      validateId(id);
      const result = await db.runAsync('DELETE FROM room_notes WHERE id = ?', id);
      if (result.changes !== 1) throw new Error('This note no longer exists.');
    },
  };
}

export type NotesRepository = ReturnType<typeof createNotesRepository>;
