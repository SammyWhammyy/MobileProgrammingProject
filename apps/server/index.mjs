import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = process.env.NOTES_DATA_DIR || path.join(directory, 'data');
const dataFile = path.join(dataDirectory, 'notes.json');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const titleLimit = 80;
const bodyLimit = 2000;
const requestLimit = 32 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function loadNotes() {
  try {
    const value = JSON.parse(await readFile(dataFile, 'utf8'));
    if (!Array.isArray(value)) throw new Error('Notes data must be a JSON array.');
    return value;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveNotes(notes) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${dataFile}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(notes, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, dataFile);
}

// Serialize reads and writes so simultaneous requests cannot overwrite one another.
let storeQueue = Promise.resolve();
function withNotes(task) {
  const result = storeQueue.then(async () => task(await loadNotes()));
  storeQueue = result.then(() => undefined, () => undefined);
  return result;
}

function send(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > requestLimit) throw new HttpError(413, 'Request body is too large.');
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected an object.');
    return body;
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

function validateNote(input) {
  const roomId = typeof input.roomId === 'string' ? input.roomId.trim() : '';
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!roomId || roomId.length > 128) throw new HttpError(400, 'Choose an available room.');
  if (!title || title.length > titleLimit) throw new HttpError(400, `Enter a title of 1 to ${titleLimit} characters.`);
  if (!body || body.length > bodyLimit) throw new HttpError(400, `Enter a note of 1 to ${bodyLimit} characters.`);
  return { roomId, title, body };
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Invalid note ID.');
  return id;
}

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (request.method === 'GET' && url.pathname === '/healthz') {
      send(response, 200, { status: 'ok' });
      return;
    }

    if (url.pathname === '/api/notes' && request.method === 'GET') {
      const notes = await withNotes((items) => [...items].sort((a, b) => b.updatedAt - a.updatedAt || b.id - a.id));
      send(response, 200, notes);
      return;
    }

    if (url.pathname === '/api/notes' && request.method === 'POST') {
      const input = validateNote(await readBody(request));
      const note = await withNotes(async (items) => {
        const now = Date.now();
        const id = items.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1;
        const created = { id, ...input, createdAt: now, updatedAt: now };
        await saveNotes([...items, created]);
        return created;
      });
      send(response, 201, note);
      return;
    }

    const match = /^\/api\/notes\/(\d+)$/.exec(url.pathname);
    if (match && request.method === 'GET') {
      const id = parseId(match[1]);
      const note = await withNotes((items) => items.find((item) => item.id === id));
      if (!note) throw new HttpError(404, 'This note no longer exists.');
      send(response, 200, note);
      return;
    }

    if (match && request.method === 'PUT') {
      const id = parseId(match[1]);
      const input = validateNote(await readBody(request));
      const note = await withNotes(async (items) => {
        const index = items.findIndex((item) => item.id === id);
        if (index < 0) throw new HttpError(404, 'This note no longer exists.');
        const updated = { ...items[index], ...input, updatedAt: Date.now() };
        const next = [...items];
        next[index] = updated;
        await saveNotes(next);
        return updated;
      });
      send(response, 200, note);
      return;
    }

    if (match && request.method === 'DELETE') {
      const id = parseId(match[1]);
      await withNotes(async (items) => {
        const next = items.filter((item) => item.id !== id);
        if (next.length === items.length) throw new HttpError(404, 'This note no longer exists.');
        await saveNotes(next);
      });
      response.writeHead(204);
      response.end();
      return;
    }

    throw new HttpError(404, 'API route not found.');
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error('Notes API error:', error);
    if (!response.headersSent) send(response, status, { error: status === 500 ? 'Internal server error.' : error.message });
    else response.destroy();
  }
});

server.listen(port, host, () => {
  console.log(`Campus notes API listening on http://${host}:${port}`);
  console.log(`Health check: http://${host}:${port}/healthz`);
});

server.on('error', (error) => {
  console.error('Could not start notes API:', error.message);
  process.exitCode = 1;
});
