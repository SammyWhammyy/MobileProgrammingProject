# Campus Navigator

An offline Android indoor navigation MVP for three floors of HAMK Building C.
Choose a starting place and destination, search rooms, and inspect a route across
floors. The application does not determine or track your location.

## MVP scope

- Three bundled floor traces based on the supplied photographs, including the curved auditoriums.
- Manual start and destination selection, room search, pan, zoom, and fit view.
- Directions collapsed by default, with a larger expandable step list.
- Local shortest-path routing with staircase transitions and selectable steps.
- SQLite storage for floor plans, nodes, edges, rooms, and map revision metadata.
- English interface, documentation, and new code comments.

Saved rooms, QR scanning, cloud sync, notes, accounts, an admin editor, route
history, and automatic positioning are deferred. A lift is visible in the source
photographs but no accessible route is advertised until its access is verified.

The map scale and door anchors are provisional. The UI deliberately omits meter
distances and walking times. Read [map verification](docs/MAP-VERIFICATION.md)
before relying on the routes in the building. C323 is not routable because its
access is unclear; C304-305 is one combined place searchable by either number.

## Setup

Use Node.js 24 LTS and npm for the included real SQLite tests. Install from the
repository root:

```bash
npm ci
npm run mobile:mock
```

The historical `mobile:mock` command opens Expo Go; map data is the Building C
dataset, not simulated positioning. Use an Expo Go version compatible with the
pinned Expo SDK 57, or build the development client below. The repository keeps
the original Android application ID to allow updating an existing installation.

For an Android development build, install JDK 17 and the Android SDK, enable USB
debugging on the phone, and authorize the computer:

```bash
npm run mobile:android
```

For a standalone Android build that embeds JavaScript for offline startup:

```bash
cd apps/mobile
npx expo run:android --variant release --device
```

Local release builds use the generated project's signing defaults. Configure a
private signing key before public distribution. No store submission is required
for the project demonstration. A development client needs Metro and is not the
artifact to use to prove first-launch offline operation.

## Verification

From the repository root:

```bash
npm run typecheck
npm test
npm run lint --workspace apps/mobile
```

Android JavaScript and Hermes compilation can be checked independently of an APK:

```bash
cd apps/mobile
npx expo export --platform android --output-dir dist
```

Tests include all room-pair path costs against Floyd-Warshall, all floor pairs,
invalid graph data, SQLite reopen, map replacement, and rollback of an interrupted
update. SQLite tests use Node's real SQLite engine through the same SQL interface;
they do not replace Android runtime tests. Follow the [device checklist](docs/ANDROID-CHECKLIST.md).

## Architecture and ownership

| Area | Owner | Location |
| --- | --- | --- |
| Map data, graph, route search, validation, SQL repository | Core | `packages/map` |
| Local SQLite loading and UI data boundary | Core | `apps/mobile/src/data` |
| App configuration, entry, manifests, lockfile | Core | Application and root configuration |
| Screen layout, floor controls, search, route presentation | UI | `apps/mobile/src/app`, `src/screens/MapScreen.tsx` |
| SVG rendering, gestures, place picker, visual tokens | UI | `apps/mobile/src/map`, `src/ui` |

The [public contract](docs/CORE-CONTRACT.md) keeps visual components independent
of persistence. The provider opens SQLite, atomically seeds changed bundled data,
reads the map back, validates it, and closes the connection. Components mount only
after successful loading; failures expose a retry action. No network is required.

Map tables contain IDs and relational references plus JSON payloads preserving
the domain types. Prepared parameter bindings are used for writes. A canonical
seed revision detects changes even if a manual data version bump is forgotten.
Replacing these tables never deletes user content because the MVP stores none.

Path search uses A* with a zero heuristic (Dijkstra ordering). This remains exact
when independent floor drawings use different coordinate origins. Route costs
are drawing units plus transfer penalties, not physical distance estimates.

## Retained prototype

`packages/core`, `packages/wifi-scanner`, and the old scanner screen files remain
as deferred prototype code. They are not imported by the MVP entry or initialized
at launch. Location and Bluetooth permissions are explicitly blocked in generated
Android manifests. Existing scanner subscription lint handling is scoped to its
retained file; map gesture shared values have a documented Reanimated exception.

The four review stages and eight owner-specific archives are delivered alongside
the repository in `MVP-Delivery`. They contain review material and cumulative owned
changes, not pre-authored Git commits. Review and adapt the work before committing
it with accurate contributor attribution.
