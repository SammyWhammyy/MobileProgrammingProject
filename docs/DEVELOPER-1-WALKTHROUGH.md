# Campus Navigator: Developer 1 Code Walkthrough

This guide explains the local core and Developer 1's React Native integration in the current project. It includes the room-notes extension. It is preparation material, not a script to read during the presentation. Explanations and code terminology are in English.

Ownership means the agreed workstream and the code you need to understand. Describe actual implementation, review, and development-tool assistance accurately. Developer 2 should understand this flow too.

## 1. Reading order and source map

Read these sections in order. Start with the data model, follow one request through the application, then study the algorithm and persistence details.

| Source | What you should be able to explain |
| --- | --- |
| `packages/map/src/types.ts` | The difference between a room, node, edge, place, snapshot, and bundle. |
| `packages/map/src/data/buildingC.ts` | How authored floor traces produce both SVG assets and graph connections. |
| `packages/map/src/authoring.ts` | How short edge definitions become validated, weighted edges. |
| `packages/map/src/graph.ts` | How edges become an adjacency list for path search. |
| `packages/map/src/heap.ts` | How the search efficiently chooses the lowest-priority node. |
| `packages/map/src/astar.ts` | How costs, predecessors, and the queue produce a shortest path. |
| `packages/map/src/route.ts` | How a public call combines graph lookup, search, floor segments, and steps. |
| `packages/map/src/steps.ts`, `describe.ts` | How graph points become route instructions and text. |
| `packages/map/src/places.ts` | How rooms become selectable endpoints and searchable results. |
| `packages/map/src/validate.ts` | How runtime checks stop broken map data before rendering. |
| `packages/map/src/storage.ts` | How map seeding, transactions, SQL reads, and validation work. |
| `apps/mobile/src/data/MapDataProvider.tsx` | How React waits for local data and handles retry. |
| `packages/map/src/notes.ts` | How the full notes CRUD repository works. |
| `apps/mobile/src/data/notes.ts` | How React Native opens the separate notes database. |
| `apps/mobile/src/app/notes/index.tsx`, `edit.tsx` | How navigation, loading, forms, and database operations work together. |
| `packages/map/src/*.test.ts` | What the tests establish and what they cannot establish. |

These paths are relative to the repository root, `D:/Campus Navigator/main/MobileProgrammingProject`.

## 2. The main distinction: data, algorithm, and presentation

The floor picture does not calculate a route. SQLite does not calculate a route either.

- The SVG asset describes what to draw: room outlines, corridors, stairs, and labels.
- The snapshot describes the domain: rooms, nodes, edges, and floors.
- The routing service finds a minimum-cost path through graph connections.
- SQLite persists map records and user notes.
- React Native displays the result and receives user input.

The same authored coordinates connect the visual map and graph within each floor. A route line appears in the correct corridor because its node coordinates use the same coordinate frame as that floor's SVG.

Your local core runs inside the mobile application. It is not an HTTP server, cloud service, or separate backend process.

## 3. `types.ts`: the contract between modules

### A room is different from a route node

A `Room` contains a catalogue identity, code, name, floor, and `doorNodeId`. A `MapNode` contains a graph identity, position, floor, and type.

For example, the actual Building C dataset uses:

```ts
room.id = 'room-C102'
room.code = 'C102'
room.doorNodeId = 'door-C102'
```

The room ID identifies a catalogue record. The room code is the label a person searches. The door node identifies where routing starts or ends. The route targets the doorway rather than an arbitrary point in the room's center.

### Edges describe permission to travel

An `Edge` references two node IDs and includes `kind`, `weight`, and `accessible`.

Coordinates alone do not grant permission to walk between two nodes. An edge must exist. This prevents the algorithm from treating every nearby room as directly connected through a wall.

### `Place` adapts data for selection

A `Place` contains a display title/subtitle and the `nodeId` needed by routing. A room place also carries `roomId`, which the notes editor uses to link a reminder to the room catalogue.

### `Snapshot` and `MapBundle`

`Snapshot` groups the building, floors, nodes, edges, and rooms. `MapBundle` also includes `svgByFloor`, a dictionary of floor IDs to SVG text.

The UI receives the whole bundle. Core modules that only need graph data can use the snapshot without knowing how an SVG component works.

TypeScript checks these shapes during development. It does not validate a corrupted database at runtime. That is why `assertMapBundle` also exists.

## 4. `buildingC.ts`: how authored traces become a usable map

### 4.1 `Point`, `Rect`, `TracedRoom`, and `FloorTrace`

```ts
type Point = readonly [x: number, y: number];
type Rect = readonly [x: number, y: number, width: number, height: number];
```

Tuple types fix the meaning and number of values. `readonly` prevents accidental edits to the coordinates through that reference.

`TracedRoom` stores its outline plus two important positions:

- `door`: the room's route endpoint.
- `approach`: a point on the corridor connected to that door.

`FloorTrace` groups corridor drawing areas, corridor centerlines, staircase boxes, room traces, and drawing dimensions. These are manually authored from reference photographs. There is no automatic image-recognition pipeline.

### 4.2 Visual corridors and route centerlines serve different purposes

`corridorAreas` contains filled SVG paths. They make corridors visible at a useful width.

`centerlines` contains polylines used to build the graph. Each adjacent pair of points becomes a candidate walking segment.

Keeping both is useful: a broad filled area is readable on a map, while a centerline is easy to split into graph edges.

### 4.3 Coordinate keys avoid duplicate graph points

```ts
const keyOf = ([x, y]: Point) => `${x},${y}`;
```

Inside each floor's loop, a `Map` stores points by coordinate key. If a corridor line and a door approach use the same position, they should share a graph point rather than create disconnected duplicates.

`addPoint` creates a coordinate-derived corridor ID by default. Named door, stair, and entrance points can replace a generic corridor point at that position so their semantic identity is retained.

### 4.4 Room definitions create door approaches and catalogue records

For each traced room, the code:

1. Adds the explicit door node.
2. Adds the approach point.
3. Adds the short segment joining the approach to the door.
4. Creates the `Room` object with `doorNodeId`.
5. Sets the label position and a suitable label size.

The default room name is `Room`. Service and auditorium names provide more meaningful labels. C304–305 has search tags for both C304 and C305.

### 4.5 Orthogonal segments reject diagonal shortcuts

```ts
if (a[0] !== b[0] && a[1] !== b[1]) {
  throw new Error(`Diagonal corridor on ${floorId}`);
}
```

For the authored corridor network, one coordinate must remain constant. A segment is horizontal or vertical. If both change, it fails immediately.

This is a rule for this dataset, not a mathematical requirement of Dijkstra. The search could support a valid diagonal corridor, but these floor plans intentionally use orthogonal corridor connections.

### 4.6 Intersections split lines into connected edges

When a vertical segment crosses a horizontal segment, the code calculates their intersection and checks that it lies on both segments using `onSegment`.

It then adds an intersection point. Without that point, two lines might visibly cross while the graph still treats them as disconnected.

For each segment, the code collects all points on it, sorts them by coordinate, and connects adjacent points. It does not connect every point to every other point.

`seenEdges` uses a sorted pair of endpoint IDs so the same undirected connection is not added twice from overlapping source segments.

### 4.7 SVG generation

`rectanglePath` converts a rectangle into an SVG path. `rect` applies room fill and wall stroke. `stair` adds repeated stair lines. Curved auditoriums use explicit paths rather than rectangular outlines.

The final SVG string combines corridor fills, room outlines, openings, stairs, and labels. A doorway opening visually matches the door approach used by the graph.

### 4.8 Cross-floor edges and transfer costs

The final connector loop joins the north staircase on floor 1 to floor 2 and floor 2 to floor 3. It does the same for the south staircase.

The stairs therefore form a sequence of landings. A route across two floors needs two transfers, not one invented jump.

`defineSnapshot` initially derives staircase costs. The Building C dataset multiplies those costs by 20 because these drawings use much larger coordinate values than the earlier fixtures. This reduces implausible same-floor detours through other floors.

That multiplier is a modeling choice, not a measured staircase travel time. A physically calibrated model would replace these drawing-based costs with verified distances or travel-time estimates.

## 5. `authoring.ts`: converting short edge specifications

An authored edge can be as short as:

```ts
['node-a', 'node-b']
['c1-stairs-south', 'c2-stairs-south', 'stairs']
```

The optional third value defaults to `walk`.

`defineSnapshot` first creates node and floor-level lookup maps. During edge conversion it rejects unknown endpoints and self-connections.

For a walking edge:

```ts
weight = Math.hypot(a.x - b.x, a.y - b.y);
```

`Math.hypot` calculates Euclidean segment length. For an orthogonal segment, that becomes the absolute difference in the changing coordinate. A walking edge must stay on one floor.

For stairs, weight depends on the difference in floor levels. Elevator edges use the elevator penalty. A transfer must change floor. Stair edges set `accessible` to `false`.

The function creates a complete `Edge` with a generated ID and verifies that every room's door node exists. It returns a snapshot of the supplied building data plus the derived edges.

The comment mentioning future server rules describes an anticipated shared format. The MVP does not currently have that server.

## 6. `graph.ts`: fast neighbor lookup

The snapshot stores an array of edge records. Searching the whole array every time the algorithm visits a node would do unnecessary work.

`buildGraph` creates:

- `nodes`: ID-to-node lookup.
- `levels`: floor-ID-to-level lookup.
- `adjacency`: node-ID-to-neighbor-list lookup.

It first gives every node an empty adjacency list. For each valid edge, it inserts a link in both directions:

```ts
from.push({ to: edge.toNodeId, weight: edge.weight, edge });
to.push({ to: edge.fromNodeId, weight: edge.weight, edge });
```

This makes the current graph undirected. A corridor can be walked in either direction. One-way access would need an explicit model change.

Accessible mode skips edges whose `accessible` flag is false. That is an algorithm capability, not proof of a verified wheelchair route in Building C. The final UI does not advertise such a route.

`buildGraph` defensively skips missing endpoint lists. The normal load path calls the validator first, so malformed references should already have failed before routing.

## 7. `heap.ts`: choosing the next candidate

`MinHeap` stores `{ value, priority }` records in an array. Here, `value` is a node ID and `priority` is its search cost.

The heap invariant is: each parent has a priority no greater than its children. This puts the smallest priority at index 0 without fully sorting the array.

### `push`

The new record goes at the end. The loop compares it with its parent and swaps upward until the invariant holds.

```ts
const parent = (i - 1) >> 1;
```

For a zero-based binary heap, the parent index is `floor((i - 1) / 2)`. The bit shift is a compact integer calculation for that index.

### `pop`

The root is the result. The last array element replaces it. The loop compares the replacement with its children, chooses the smallest, and swaps downward until the invariant holds again.

An empty heap returns `undefined`. A single-element heap needs no downward repair.

Push and pop take logarithmic time in heap size. The search does not need an expensive full-array sort on each iteration.

## 8. `astar.ts`: the actual path-search loop

### 8.1 Early checks

Unknown start or goal IDs return `null`. Equal endpoints return one node with zero cost. The UI separately explains equal endpoints to the user.

### 8.2 The heuristic

```ts
const heuristic = (_id: string) => 0;
```

In A*, priority is `g + h`: known cost from the start plus estimated cost to the goal. Here, `h = 0`, so priority is just `g`. This is Dijkstra ordering.

Floor drawing coordinates have independent origins. A naive straight-line estimate across floors could overestimate the remaining cost. Zero never overestimates. With nonnegative weights it preserves the minimum-cost result and is adequate for this small graph.

### 8.3 The state containers

| Variable | Meaning |
| --- | --- |
| `cost` | Best cost discovered so far for each node. |
| `cameFrom` | Predecessor on that best discovered route. |
| `closed` | Nodes whose final cost has already been settled. |
| `open` | Candidate nodes ordered by priority in the heap. |

The start receives cost 0 and enters `open`.

### 8.4 One iteration

The loop pops the lowest-priority candidate. If it is the goal, it reconstructs the path. If it is already closed, it skips the stale queue entry. Otherwise it closes that node and examines its neighbors.

For each neighbor:

```ts
const next = base + link.weight;
if (next < (cost.get(link.to) ?? Infinity)) {
  cost.set(link.to, next);
  cameFrom.set(link.to, current);
  open.push(link.to, next + heuristic(link.to));
}
```

`base` is the cost to the current node. Adding the edge weight gives a candidate cost to its neighbor. An undiscovered node is treated as having infinite cost.

Only a better candidate replaces the known cost and predecessor. This comparison is called edge relaxation.

### 8.5 A small example

Suppose A connects to B with cost 4 and C with cost 10. B connects to C with cost 3.

1. Start: `cost[A] = 0`.
2. Visit A: discover B at 4 and C at 10.
3. Visit B next: discover a better C cost, `4 + 3 = 7`.
4. Replace C's predecessor with B and queue C at 7.
5. Visit C at 7: reconstruct A, B, C.

The older C-at-10 queue entry can remain in the heap. Closed-node handling prevents it from causing repeated exploration.

### 8.6 Path reconstruction

Starting at the goal, the code follows `cameFrom` backward until it reaches the start. It reverses that array before returning it.

The result contains node IDs and total configured cost. The legacy property name `lengthM` does not make uncalibrated Building C costs physical meters.

If the queue empties before reaching the goal, the function returns `null`.

## 9. `route.ts`: one public service for the UI

`planRoute` coordinates several smaller modules:

```ts
const graph = getGraph(snapshot, mode);
const path = findPath(graph, fromNodeId, toNodeId);
if (!path) return null;
```

For a found path, it returns the IDs and cost, then calls:

- `splitByFloor` to produce drawable floor segments.
- `buildSteps` to produce structured instructions.

The UI does not have to reconstruct paths or inspect raw adjacency lists.

### Why `WeakMap` caches the graph

```ts
const graphCache = new WeakMap<Snapshot, Partial<Record<RouteMode, Graph>>>();
```

The same loaded snapshot can serve many route requests. Rebuilding its adjacency list each time is unnecessary. The cache stores one graph per snapshot object and route mode.

`WeakMap` uses the snapshot object as a key without preventing that object from being garbage-collected when no other part of the app uses it.

The snapshot must be treated as immutable after caching. Changing its edges in place would leave the cached graph stale. A changed dataset should create a new snapshot object.

## 10. `steps.ts` and `describe.ts`: from points to instructions

### `splitByFloor`

Walk through the path in order. Append each node to the last segment if the floor matches. Otherwise start a new segment.

This preserves the path sequence, including transfer landings. It does not simply group all nodes with the same floor ID, which could lose the order of a route that revisits a floor.

### `turnAt`

Three points A, B, C define two direction vectors, A-to-B and B-to-C.

- `Math.hypot` calculates their lengths.
- The normalized dot product gives the cosine of the angle.
- `Math.acos` converts it to an angle, then the code converts radians to degrees.
- Clamping the cosine to [-1, 1] prevents floating-point errors from producing NaN.
- An angle below 30 degrees is straight.
- An angle above 150 degrees is a turn back.
- Otherwise, the cross-product sign distinguishes left and right.

SVG's y axis points downward. The code accounts for that when interpreting the cross-product sign.

### `buildSteps`

`runM` accumulates a straight run. The local `flushRun` function emits a straight instruction and resets that accumulator.

The loop inspects successive points:

1. A floor change flushes the current run and creates a `changeFloor` step.
2. A same-floor move adds its segment length.
3. A non-straight turn flushes the run and emits a turn step.
4. The end flushes the last run and adds arrival.

Floor-change instructions carry the source landing, target floor ID, target level, direction up/down, and connector label. Those fields let the UI open the correct next floor without guessing from the instruction text.

### Text formatting and the metric limitation

`describeStep` uses a `switch` on the step kind and creates English text. Its straight-step branch still formats the legacy distance as meters.

The final `MapScreen` intentionally replaces straight-step text with “Follow the highlighted corridor” for this uncalibrated map. Do not use `describeStep`'s metric text as evidence of physical distance accuracy. It is a legacy contract limitation to explain honestly.

## 11. `places.ts`: room search and routing endpoints

`listPlaces` creates floor-name and floor-level lookup maps. It converts each room into a `Place` whose `nodeId` is that room's door node.

It also adds labeled entrances, stairs, and elevators. Generic corridor points and unlabeled points do not need to clutter the room picker.

The combined catalogue sorts by floor level, then title.

`searchPlaces` trims and lowercases the query. An empty query returns the existing catalogue. For other queries it matches the place title, then room name or tags where a room reference exists.

The search uses in-memory arrays. It does not concatenate user text into SQL or call a remote search API.

The notes editor filters catalogue places to those with a `roomId`. A reminder attaches to a room, not a generic stair landing.

## 12. `validate.ts`: runtime protection

`assertMapBundle` returns nothing when data passes and throws an error when an invariant fails. The name “assert” signals that valid data is a requirement for continuing.

Its local `unique` helper builds an ID lookup map and compares its size with the original array length. A smaller map indicates duplicate IDs. It also rejects empty IDs.

The remaining loops check:

- At least one floor exists.
- Floors belong to the current building, have integer levels and valid positive dimensions, and have SVG assets.
- Node coordinates are finite and lie inside a referenced floor.
- Edges reference existing, different nodes and have finite, nonnegative weights.
- Walking edges remain on one floor, and transfer edges change floors.
- Stair edges cannot claim accessibility.
- Room codes are present and unique, and their door nodes are on the same floor.

`Number.isFinite` rejects NaN and infinity, which could break drawing or cost comparisons even though their JavaScript type is `number`.

This validator checks structural consistency. It cannot determine whether an actual door exists or whether a corridor is locked. Those require field checks.

## 13. `storage.ts`: map persistence in detail

### 13.1 `MapDatabase` is an adapter contract

The interface lists only the SQL methods the map repository needs. Expo SQLite implements those methods on Android. Tests provide an adapter backed by Node's real SQLite engine.

This keeps the production SQL testable without importing React Native into the test runner.

### 13.2 Schema and constraints

`map_floors` stores a floor ID, JSON payload, and SVG text. Nodes reference floors. Edges reference endpoint nodes. Rooms reference floors and door nodes. Metadata stores the building and revision.

The design combines relational references with JSON payloads. Foreign keys protect relationships, while runtime validation checks fields inside JSON.

### 13.3 Startup setup

The repository first validates the bundled seed, then enables WAL and foreign keys and creates tables if necessary.

WAL changes SQLite's journaling behavior. Foreign keys enforce declared references on that connection. Neither feature validates the real building geometry.

### 13.4 Revision detection

```ts
const revision = JSON.stringify(seed);
```

The code compares serialized seed content with stored metadata. If the content changes, reseeding runs even if a manual version number was not incremented.

This is a serialized comparison token, not a cryptographic hash. It is simple for a small dataset, but it stores a large revision value and can detect non-semantic changes such as object ordering. A compact, deliberately versioned migration scheme would suit a larger application.

### 13.5 Atomic replacement

All replacement work runs inside `withExclusiveTransactionAsync`.

The code deletes dependent room and edge records before nodes and floors, then inserts floors before records that reference them. That order respects foreign keys.

Every inserted value uses a `?` placeholder and a bound parameter. Quotes in text remain data.

If any operation fails, the transaction rolls back. Previously committed map content remains intact. The current startup can still report an error and ask for retry; the app does not promise an automatic fallback screen.

User notes are not in these replacement tables and use a different database file, so map reseeding cannot delete them.

### 13.6 Reading back from SQLite

After possible seeding, the code SELECTs metadata, floors, nodes, edges, and rooms. It parses JSON payloads, rebuilds `svgByFloor`, and assembles a new `MapBundle`.

The helper `readPayloads` only accepts a fixed union of table names. It is not a user-supplied table-name string.

Finally, `assertMapBundle` checks the reconstructed database data. Only then does the repository return it to React.

## 14. `MapDataProvider.tsx`: your React Native startup logic

### 14.1 React Context

`createContext<MapBundle | null>(null)` defines a shared data boundary. Descendant screens call `useMapBundle` instead of manually passing the bundle through every component.

`useMapBundle` throws if a screen uses it outside the provider. That error identifies a programming/configuration mistake.

### 14.2 The three state values

- `bundle`: loaded data, initially null.
- `error`: whether the latest initialization failed.
- `attempt`: a retry counter.

`useEffect` starts the asynchronous load on mount and whenever `attempt` changes. It does not run on every ordinary render.

### 14.3 Cleanup and asynchronous completion

The local `cancelled` flag becomes true in cleanup. A Promise that completes after unmount must not update that component's state.

This cancels delivery of the result to React. It does not interrupt SQLite in the middle of a transaction.

### 14.4 Loading and retry screens

Until the bundle exists, the provider renders a loading indicator or error message. Its children, including map screens, do not mount with partial data.

Try again clears the visible error and increments `attempt`, causing a new effect run. This is actual React Native UI work in Developer 1's part.

### 14.5 Sharing initialization

At module scope:

```ts
let pending: Promise<MapBundle> | undefined;
```

`getLocalMap` uses `pending ??=` to reuse an existing initialization Promise. Repeated mounts, including development Strict Mode behavior, do not start competing seed operations.

The inner async function opens `campus-navigator.db`, loads the stored map, and closes the connection in `finally` even when loading fails.

The catch handler resets `pending` to undefined before rethrowing. Without that reset, retry could repeatedly receive the same rejected Promise instead of opening the database again.

After success, the Promise holds the immutable in-memory bundle. The provider does not reread SQLite on every route calculation.

## 15. `notes.ts`: full user-visible CRUD

### 15.1 A different kind of persistence

Map tables describe bundled reference data. Notes contain user-created data. They have different lifecycles, so the app stores notes in `campus-notes.db` separately from `campus-navigator.db`.

`RoomNote` contains an integer ID, room ID, title, body, and creation/update timestamps. `NoteInput` contains only room ID, title, and body. A caller cannot supply a different creation timestamp through this input type.

### 15.2 Initialization

`initializeNotes` enables WAL and uses `CREATE TABLE IF NOT EXISTS`. Reopening the app creates missing schema but never clears existing notes.

The table uses an auto-incrementing integer primary key and SQL checks for nonempty title/body and their limits. TypeScript-side validation adds room checks and clearer messages.

### 15.3 Repository factory and closure

`createNotesRepository(db, roomIds)` captures the database and a Set of allowed room IDs. Its methods share those dependencies through a closure.

The Set makes room membership checks straightforward. There is deliberately no cross-database foreign key. If a later map removes a room, the note remains readable so the user can reassign or delete it.

### 15.4 Validation before writes

The local `validate` function checks the room ID, trims text, and enforces title length 1–80 and body length 1–2000. It returns a clean input object rather than mutating the original form state.

`validateId` requires a positive safe integer. It rejects NaN, fractional values, and invalid IDs before a query runs.

### 15.5 Create

```sql
INSERT INTO room_notes (roomId, title, body, createdAt, updatedAt)
VALUES (?, ?, ?, ?, ?)
```

The repository validates input, creates timestamps using `Date.now()`, and binds values. `lastInsertRowId` identifies the new record. This is a real SQLite INSERT triggered by the Save button, not a simulated array append.

### 15.6 Read

`list` SELECTs notes ordered by most recent update, then ID. The ID is a stable tie-breaker when timestamps match.

`get(id)` SELECTs by a bound ID and returns the record or null. The editor reads the full stored body instead of relying on the shortened list preview.

### 15.7 Update

```sql
UPDATE room_notes
SET roomId = ?, title = ?, body = ?, updatedAt = ?
WHERE id = ?
```

The ID and creation timestamp remain unchanged. The repository changes the same record rather than creating a duplicate.

`result.changes` must equal 1. A missing record reports an error instead of pretending that saving succeeded.

### 15.8 Delete

`DELETE FROM room_notes WHERE id = ?` removes only the selected record. It also checks the affected-row count.

The confirmation dialog belongs to the UI layer. The repository performs the deletion after that decision.

### 15.9 Why there is no explicit transaction around each note write

Each create, update, or delete is one SQL statement. SQLite applies a single statement atomically. A future operation that changes several related rows together should use an explicit transaction.

## 16. `src/data/notes.ts`: opening SQLite for the screens

The adapter caches a Promise for an initialized database connection. Multiple screens do not race to initialize separate connections.

It opens the notes database and calls `initializeNotes`. If initialization fails, it closes that failed connection, resets the cached Promise, and allows a future retry.

Unlike the map loader, it keeps the successful notes connection open because screens repeatedly read and write notes. The operating system closes it when the application process ends.

`getNotesRepository(roomIds)` creates a repository using that connection and the current room catalogue. The UI never writes SQL directly.

## 17. Notes screens: concrete React Native integration

### 17.1 Root Stack and the map entry button

`src/app/_layout.tsx` declares the map, notes list, and editor as Expo Router Stack screens. `index.tsx` adds a Room notes button calling `router.push('/notes')`.

The screen navigation is separate from map floor switching. For the course criteria, demonstrate actual map-to-list-to-editor navigation and Back.

### 17.2 The notes list and `useFocusEffect`

The list should refresh after saving or deleting a note. Mount-only loading would leave stale records when the screen returns from the editor.

`useFocusEffect` calls `reload` whenever the list gains focus. `reload` sets loading state and calls repository `list()`.

A `generation` ref increments for each request and when the screen loses focus. An asynchronous response updates React state only if its request generation is still current. This prevents a slow earlier response from overwriting newer results.

`FlatList` uses the database ID as a stable key. `NoteCard` displays a preview and opens the editor with that ID as a route parameter. The room and floor labels come from the current snapshot.

### 17.3 Editor route parameters

No `id` means Create mode. An ID parameter means Edit mode. A digit check plus the safe-integer check reject malformed links.

In Edit mode, the loader fetches the existing row. A nonexistent note shows a message. It does not silently switch into Create mode and write a duplicate.

### 17.4 Controlled form state

`draft` is the current room, title, and body. Each TextInput receives its current value and an `onChangeText` callback.

`original` holds the loaded values. Comparing it with `draft` determines whether leaving would discard changes.

`PlacePicker` reuses the existing room search component. The editor filters it to room places and stores the selected `roomId`.

### 17.5 Loading, ready, busy, and errors

- `loading`: database initialization or record lookup is in progress.
- `ready`: the editor has enough data to accept writes.
- `busy`: a save/delete operation is in progress and controls are disabled.
- `loadError`: initial record/database loading failed.
- `error`: the latest write or validation failed, so the draft stays open.

These states prevent a user from saving an uninitialized editor or losing text after a failed write.

### 17.6 Why both a ref lock and busy state exist

`setBusy(true)` schedules a React render. A very fast second tap can arrive before that render disables the button.

`locked.current = true` changes synchronously. `mutate` checks this ref before starting and therefore blocks a duplicate write immediately. Busy state remains useful for visual feedback.

### 17.7 `mutate`

The mutation function obtains the repository, then selects the correct operation:

- Delete action calls `remove(id)`.
- Save in Edit mode calls `update(id, draft)`.
- Save in Create mode calls `create(draft)`.

After success it returns to the list, whose focus handler rereads SQLite. After failure it displays the error and preserves the form. The `finally` block releases the lock.

### 17.8 Unsaved changes and Android Back

The editor's Back button and Android hardware Back use `requestBack`. If the form is dirty, an Alert offers Keep editing or Discard.

During a write, the lock blocks leaving. The hardware-back subscription is removed when the screen loses focus. The editor also disables iOS swipe-back gestures so that route does not bypass the custom confirmation.

This is protection for the UI exit paths implemented here, not a permanent draft-recovery system. Force-stopping the app can still lose unsaved text.

### 17.9 Delete confirmation

Delete first opens an Alert. Cancel does nothing. Confirm calls the repository mutation. Database errors keep the editor visible rather than falsely removing its card locally.

## 18. Tests: the mechanism behind each group

### `routing.test.ts`

Focused routing fixtures exercise search behavior, edge modes, floor splitting and instruction logic. Small fixtures make failures easier to locate than a large building dataset alone.

### `buildingC.test.ts`

The all-pairs test creates a distance matrix. It sets zero on the diagonal and edge costs for directly connected nodes, then runs Floyd–Warshall:

```ts
distances[i][j] = Math.min(
  distances[i][j],
  distances[i][k] + distances[k][j],
);
```

The three loops consider every node as a possible intermediate point. The test compares that independent result with production route costs for room pairs. It also checks endpoint IDs, floor transitions and same-floor routes.

This catches many errors in the production heap-based search. Both algorithms still use the same authored graph, so their agreement does not establish physical building accuracy.

### `storage.test.ts`

A small adapter forwards the repository's asynchronous interface to a real Node SQLite connection. Tests close and reopen a database, change seed content, and simulate a failed write inside a transaction.

The rollback test then reloads the original map and confirms it remains intact.

### `notes.test.ts`

Six tests cover the complete Create/Read/Update/Delete lifecycle, reopen persistence, SQL-looking text, invalid inputs, missing IDs and a room removed from the catalogue.

The text containing quotes and SQL syntax must remain ordinary note content. This demonstrates why parameter binding matters.

These are real SQLite repository tests, but they are not Android tap tests. The React Native screens, keyboard behavior and standalone startup still need device verification.

## 19. Useful syntax in these files

| Syntax | Meaning in this project |
| --- | --- |
| `async` / `await` | Wait for database operations without blocking the JavaScript event loop with a synchronous SQL call. |
| `try` / `catch` / `finally` | Separate success, failure, and cleanup that must run in either case. |
| `??` | Use a fallback only for null or undefined, preserving values such as zero. |
| `??=` | Initialize and cache a missing value, such as a Promise or graph. |
| `?.` | Safely access an optional record or property. |
| `!` after an expression | Tell TypeScript a value is present. It does not perform a runtime check. |
| `Map` | Keyed lookup for nodes, floors, costs, or coordinates. |
| `Set` | Membership and uniqueness checks, such as visited nodes or valid rooms. |
| `WeakMap` | Cache keyed by object identity without keeping unused snapshots alive. |
| `{ ...value, title }` | Make a new object with one changed field, preserving immutable React updates. |
| `useMemo` | Reuse derived catalogue/ID arrays until their dependencies change. |
| `useCallback` | Keep callback identity stable while its dependencies remain unchanged. |
| `useRef` | Hold a mutable lock or request counter without triggering rendering. |
| `useState` | Store values that affect what React renders. |
| `useEffect` | Synchronize a component with asynchronous initialization and cleanup. |
| `useFocusEffect` | Run loading or subscriptions when a navigation screen gains focus. |

## 20. Two complete execution traces to rehearse

### Application startup and route calculation

1. `apps/mobile/index.ts` imports the Expo Router entry.
2. The root layout mounts `MapDataProvider` around the Stack.
3. The provider calls the shared map-loading Promise.
4. `loadStoredMap` validates, initializes/reseeds if needed, reads and validates the database.
5. The provider receives `MapBundle` and mounts its children.
6. `listPlaces` provides selectable endpoints.
7. The user selects a room code, but the UI passes its `nodeId` to `planRoute`.
8. `getGraph` retrieves or creates the adjacency list.
9. `findPath` computes costs and reconstructs node IDs.
10. `splitByFloor` and `buildSteps` produce presentation data.
11. Developer 2's map component draws the current-floor segment and endpoint markers.

### Creating and editing a room reminder

1. Room notes pushes the list route.
2. The focus handler SELECTs persisted notes.
3. New note pushes the editor without an ID.
4. The user selects the catalogue room ID and types controlled form values.
5. Save acquires the ref lock and calls repository `create`.
6. Validation trims and checks the input, then INSERT binds the values.
7. Back navigation returns to the list, whose focus handler SELECTs the new row.
8. Opening its card passes the stable ID to the editor.
9. The editor SELECTs that record and copies it into draft/original state.
10. Save in Edit mode UPDATEs the same ID rather than INSERTing another record.
11. Confirmed Delete DELETEs that ID, and the refreshed list no longer contains it.

For the presentation, explain one of these flows with a concrete example and point to the relevant function. For preparation, be able to explain each intermediate block without relying on the file name alone.
