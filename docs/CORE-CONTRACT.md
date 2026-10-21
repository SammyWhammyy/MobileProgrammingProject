# MVP map contract

The UI reads a `MapBundle` through `useMapBundle` in `src/data/MapDataProvider.tsx`.
Core owns that provider, map data, persistence, configuration, and `@campus/map`.
UI owns `src/app`, `src/screens`, `src/map`, and `src/ui`.

Use public exports `listPlaces`, `searchPlaces`, `planRoute`, and `describeStep`.
Room selection uses a `Place.nodeId`; route calculation returns `Route | null`.
Identical endpoints are a separate UI state. Invalid IDs and unreachable targets
must not crash route planning. No device location is available.

The initial provider uses the existing floor as a development fixture. Stage 2
supplies three photo-based floor traces; stage 3 persists them in SQLite before
exposing the bundle. The provider gates loading and errors, so UI screens only
mount with a complete bundle. Floor SVGs and graph coordinates share one frame.

Building C plans are rectified traces of the supplied photographs. Physical
scale and exact door positions need field verification. Do not display physical
distances, arrival times, or precise walking measurements for uncalibrated data.

## Room notes extension

`createNotesRepository(db, roomIds)` exposes `list`, `get`, `create`, `update`,
and `remove`. `initializeNotes` creates the user schema without deleting records.
The mobile adapter opens `campus-notes.db` once and retries failed initialization.
The current room IDs validate writes. Reads preserve notes if a referenced room
later disappears, so the user can reassociate or delete them.

`RoomNote` contains `id`, `roomId`, `title`, `body`, `createdAt`, and `updatedAt`.
Titles require 1–80 trimmed characters and note bodies require 1–2000.
Each write uses a single parameterized SQL statement. Missing update/delete
targets report an error. These user records never enter the replaceable map seed.

The map header opens `/notes`. Selecting a card opens `/notes/edit?id=...`;
New note opens the same editor without an ID. The list refreshes on focus.
Editor Back actions guard unsaved edits; Delete requires confirmation.
Loading, empty, validation-error, database-error and retry states are explicit.
