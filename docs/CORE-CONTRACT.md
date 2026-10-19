# MVP map contract

The UI reads a `MapBundle` through `useMapBundle` in `src/data/MapDataProvider.tsx`.
Core owns that provider, map data, persistence, configuration, and `@campus/map`.
UI owns `src/app`, `src/screens`, `src/map`, and `src/ui`.

Use public exports `listPlaces`, `searchPlaces`, `planRoute`, and `describeStep`.
Room selection uses a `Place.nodeId`; route calculation returns `Route | null`.
Identical endpoints are a separate UI state. Invalid IDs and unreachable targets
must not crash route planning. No device location is available.

The initial provider uses the existing floor as a development fixture. Stage 2
supplies three schematic floor plans; stage 3 persists them in SQLite before
exposing the bundle. The provider gates loading and errors, so UI screens only
mount with a complete bundle. Floor SVGs and graph coordinates share one frame.

Building C plans are traced schematically from supplied photographs. Physical
scale and exact door positions need field verification. Do not display physical
distances, arrival times, or precise walking measurements for uncalibrated data.
