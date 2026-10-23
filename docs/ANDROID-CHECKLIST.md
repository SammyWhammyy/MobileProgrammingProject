# Android MVP acceptance checklist

Run this checklist on the integrated build. Record actual device and build
details and attach observations to the corresponding Trello cards.

- [ ] Cold-start an installed build with airplane mode enabled on first launch.
- [ ] Open each floor, pinch, pan, and use Fit map.
- [ ] Choose the starting point manually; no device-position indicator appears.
- [ ] Search C102, C205, C229, C304, C305, and C339; verify result floor labels.
- [ ] Plan C102 to C130, C206 to C229, and C316 to C339.
- [ ] Plan C102 to C339, C205 to C340, and C331 to C104.
- [ ] Tap a route step and confirm the associated point and floor are shown.
- [ ] A new route starts with directions collapsed, leaving the map visible.
- [ ] Show steps opens a larger scrollable panel; Hide steps returns space to the map.
- [ ] Clearing or replacing a route resets the panel to its collapsed state.
- [ ] Use Open floor at a staircase instruction and inspect the next floor.
- [ ] Swap endpoints and clear the route; stale lines and highlights disappear.
- [ ] Select identical endpoints and an empty search result without a crash.
- [ ] Open and close search with both the Close button and Android Back.
- [ ] Confirm the keyboard does not hide selectable search results.
- [ ] Restart the app; bundled map data is read from SQLite again.
- [ ] Deny location and Bluetooth permissions; map navigation still works.
- [ ] Verify no saved rooms, Wi-Fi, BLE, recording, admin, or QR screens appear.
- [ ] Compare actual doors, stairs, and corridors with MAP-VERIFICATION.md.

## Notes API

- [ ] Start the Node server and connect the phone using `docs/NOTES-API.md`.
- [ ] Create a note for C102 titled Bring an adapter with nonempty text.
- [ ] Confirm the card appears, opens the complete record, and returns to the list after save.
- [ ] Edit the title, body, and room to C339; confirm the same record changes.
- [ ] Restart the app and confirm the note remains on the server.
- [ ] Reject a missing room, blank title, or whitespace-only text.
- [ ] Verify title/body limits, scrolling, and keyboard visibility.
- [ ] Cancel and confirm delete; verify it remains deleted after restart.
- [ ] Stop the server: notes show a connection error and the map remains usable.
- [ ] Restart the server: existing notes load from its JSON data file.
- [ ] Confirm an unavailable old room can be changed to a current room.

Passing automated routing and SQLite tests does not establish real-world door
accuracy, API availability, or validate gestures on a physical device.
