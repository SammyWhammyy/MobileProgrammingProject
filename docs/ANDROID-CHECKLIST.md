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

## Room notes and explicit screen navigation

- [ ] From the map, open Room notes, then New note. Use Android Back to return.
- [ ] Create a note for C102 titled Bring an adapter with nonempty note text.
- [ ] Confirm the saved card appears in the list and opens the complete record.
- [ ] Edit the title, body, and room to C339. Save and confirm the same record changes.
- [ ] Restart the app and verify that the edited note remains in the list.
- [ ] Try saving without a room, with a blank title, and with whitespace-only text.
- [ ] Verify title/body limits, multiline scrolling, and keyboard visibility.
- [ ] Edit a note and press Back. Keep editing preserves the draft; Discard returns.
- [ ] Tap Delete note, cancel once, then confirm. The note disappears from the list.
- [ ] Reopen Room notes after deletion and after restart; the note stays deleted.
- [ ] Confirm map endpoint selection and route state survive opening and leaving notes.
- [ ] Verify Room notes works in a standalone build without Metro or a network.

Passing automated routing and SQLite tests does not establish real-world door
accuracy or validate gestures on a physical device.
