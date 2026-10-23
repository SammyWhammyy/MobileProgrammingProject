# Room notes API

Room notes are stored in a JSON file by a small Node.js server. The app sends
all create, read, update, and delete operations over HTTP; Expo SQLite is not
used for notes. The map remains bundled locally and continues to work offline.

## Start the API

From the repository root:

```bash
npm run server
```

The server listens on `127.0.0.1:3000`. It creates
`apps/server/data/notes.json` on the first write. That file is ignored by Git
and survives server restarts. `GET /healthz` returns `{ "status": "ok" }`.

## Connect an Android phone over USB

Copy `apps/mobile/.env.example` to `apps/mobile/.env.local` (or set the same
environment variable in the shell that starts Expo):

```dotenv
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
```

Enable USB debugging, connect and authorize the phone, then run:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

Run `npm run server` in one terminal and `npm run mobile:mock` in a second one.
Keep both processes running while using the app. After changing `.env.local`,
restart Expo so the public environment variable is embedded in the JS bundle.

## Connect over Wi-Fi

Set `EXPO_PUBLIC_API_URL` to the development computer's LAN address, for example
`http://192.168.1.20:3000`. Start the server with `HOST=0.0.0.0 npm run server`
(PowerShell: `$env:HOST='0.0.0.0'; npm run server`) and allow port 3000 on the
trusted local network. Do not expose this unauthenticated demo server to the
public internet. For an Android emulator, use `http://10.0.2.2:3000`.

The app's Android config permits HTTP so a local development API can be used in
a native build. Use HTTPS and access control before deploying outside a trusted
development network.

## Endpoints

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/notes` | List notes, newest update first |
| GET | `/api/notes/:id` | Read one note |
| POST | `/api/notes` | Create a note; body is `{ "roomId", "title", "body" }` |
| PUT | `/api/notes/:id` | Replace its room, title, and body |
| DELETE | `/api/notes/:id` | Delete one note |

Writes validate required text and the 80-character title and 2000-character
body limits. The Node process serializes access and atomically replaces the JSON
file so concurrent requests do not overwrite each other's changes.
