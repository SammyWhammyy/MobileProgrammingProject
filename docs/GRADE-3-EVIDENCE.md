# Grade 3 technical evidence

The supplied evaluation screenshot requires cumulative basics, SQLite/server read
and write, a custom component, full CRUD, and a navigation system for grade 3.
This project uses SQLite locally. A server is outside this target scope.
This mapping records implementation evidence, not a guaranteed instructor grade.

| Requirement | Concrete evidence | How to show it |
| --- | --- | --- |
| Complexity beyond a simple exercise | Three-floor graph, routing, SVG maps, persistence, validation | Explain one cross-floor route and its graph connections. |
| Styled React Native UI | Shared dark palette, readable cards and inputs, map gestures | Show map, notes list, editor, and keyboard behavior. |
| React Native work for each member | Developer 1: provider/startup and notes integration. Developer 2: map UI, renderer and picker | Each presenter explains relevant React Native code and the shared contract. |
| SQLite Read | `list` and `get` execute SELECT on `room_notes` | Open the notes list and a saved record. |
| SQLite Create | `create` executes INSERT with bound values | Create a reminder linked to C102. |
| SQLite Update | `update` executes UPDATE by ID | Edit that note and verify the changed card. |
| SQLite Delete | `remove` executes DELETE by ID | Confirm deletion and verify it stays removed. |
| Custom component | `NoteCard`, `PlacePicker`, `FloorMap` | Explain their props and reuse. |
| Screen navigation | Expo Router Stack: map, list, editor | Move through all three routes and use Android Back. |
| GitHub and project management | Git branches/merge history and project Trello board | Open actual repository history and current task states. |
| Shared understanding | Both presenters can explain the other layer | Rehearse route search, SQLite writes and UI state together. |

## A two-minute CRUD demonstration

1. Open Room notes from the map and select New note.
2. Choose C102, enter Bring an adapter, add a reminder, and Save (Create).
3. Open the saved card and show the full text (Read).
4. Change its title/body and room to C339, then Save (Update).
5. Restart the app and reopen the record to establish persistence.
6. Delete the note, confirm, and show that it no longer appears (Delete).
7. Return to the map using the screen navigation.

If limited to one minute, perform the restart before the presentation and show
Create, Read, Update and Delete live. Do not claim a restart check unless performed.

## Data separation

`campus-navigator.db` stores replaceable map data. `campus-notes.db` stores user
notes. Initializing the notes schema never seeds or clears notes. Room IDs in
notes deliberately have no cross-database foreign key: the repository validates
the current catalogue on writes while retaining older notes for recovery.

The new feature is an additional integration change after the original four
review stages. Those archives remain historical checkpoints, not the current
submission. Describe actual implementation and review contributions accurately.

## Checks

31 automated tests in four files cover routing, map persistence and notes CRUD.
Notes tests use real SQLite and check persistence across reopen, SQL-looking text,
validation failures, missing IDs, and removed room references. Android interaction
and standalone offline checks are tracked separately in ANDROID-CHECKLIST.md.

Reference APIs: [Expo SQLite SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)
and [Expo Router navigation](https://docs.expo.dev/router/basics/navigation/).
