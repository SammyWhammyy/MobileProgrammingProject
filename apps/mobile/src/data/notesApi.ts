export interface RoomNote {
  id: number;
  roomId: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export type NoteInput = Pick<RoomNote, 'roomId' | 'title' | 'body'>;

export const NOTE_TITLE_LIMIT = 80;
export const NOTE_BODY_LIMIT = 2000;

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

async function request<T>(route: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${route}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new Error(`Cannot reach the notes server at ${apiUrl}. Start the server and check the phone connection.`);
  }

  if (!response.ok) {
    let message = `Notes server returned ${response.status}.`;
    try {
      const result = await response.json() as { error?: string };
      if (result.error) message = result.error;
    } catch { /* Keep the HTTP status message when there is no JSON error response. */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export const notesApi = {
  list: () => request<RoomNote[]>('/api/notes'),
  get: (id: number) => request<RoomNote>(`/api/notes/${id}`),
  create: (input: NoteInput) => request<RoomNote>('/api/notes', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: NoteInput) => request<RoomNote>(`/api/notes/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`/api/notes/${id}`, { method: 'DELETE' }),
};
