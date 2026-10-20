# MVP validation record

Validation date: 19 October 2026.

| Check | Result |
| --- | --- |
| Workspace TypeScript checks | Passed |
| Routing and SQLite test suite | 25 tests passed in 3 files |
| Android Hermes export | Passed with 1809 bundled modules |
| Mobile ESLint | Passed without warnings |
| Native Android build | Debug APK built and installed on Samsung SM-G991B |
| Android launch and map loading | Passed after USB forwarding and IPv4 Metro binding |
| Android room search and manual endpoints | C102 and C339 selected successfully |
| Android cross-floor route | C102 to C339 displayed across all three floors |
| Android floor transition actions | Open floor 2 and Open floor 3 selected the correct floor |
| Android SQLite contents | 3 floors, 36 places, 99 nodes, 103 edges; zero foreign key errors |
| Revised floor geometry | All three photo-based traces inspected on the Samsung device |
| Collapsible directions | Collapsed by default; expanded list and return to the large map verified |
| Physical building route walk | Not performed |
| Standalone first-launch airplane mode test | Not performed |

The tests use real SQLite through Node 24, including database reopen, changed
bundled data, failed transaction rollback, and rejection of broken room references.
An independent Floyd-Warshall calculation checks production path costs for every
ordered room pair. All floor pairs and unavailable accessible routes are covered.

The first sandboxed test and Hermes runs encountered temporary-file permission
restrictions. The same commands passed when rerun with the required access.
This distinction is environmental and does not replace device verification.

The first development launch could not reach a localhost-only Metro server.
Starting Metro on IPv4 localhost (`NODE_OPTIONS=--dns-result-order=ipv4first`)
and using `adb reverse tcp:8081 tcp:8081` resolved it without LAN exposure.
This concerns development transport; the map repository itself does not use HTTP.
The installed development client still needs Metro for its JavaScript bundle.
No standalone APK or first-launch offline claim is made by these device checks.

Visual inspection found an overlapping service label near the south stairs and
an oversized label in a narrow room. Both were corrected in the final source.
The intermediate stair landing also needed a transfer marker when its route
segment contains only one node; the final renderer includes that marker.
Screenshots and the inspected map-only database are retained in the sibling
delivery directory under `device-check` and `device-check-revision` for review.

The geometry revision replaces the common schematic grid with separate floor
traces and explicit doorway approaches. Regression checks reject diagonal walk
edges, room-interior crossings, and unnecessary floor changes for same-floor
room pairs. The directions panel starts collapsed and can expand within the
remaining map area; both states were inspected on the connected phone.

## Remaining map verification

All floor maps are photo-based traces, not surveyed floor plans. Door anchors and
staircase continuity require field checks. Physical distances and walking times
are intentionally absent. C323 is excluded until its access is confirmed; the
lift is not exposed as an accessible connector.

Follow MAP-VERIFICATION.md and ANDROID-CHECKLIST.md before declaring the building
navigation physically verified. Automated tests establish graph consistency,
not the accuracy of the supplied photographs or inferred door positions.
