# Campus Navigator

Indoor navigation for the campus based on radio and sensor fingerprints (Wi-Fi, Bluetooth LE, magnetic field, barometer).
Current stage: a scanner app that shows and records everything the phone can sense.

## Repository layout

```
apps/
  mobile/              React Native (Expo) app: screens, navigation, UI kit
packages/
  core/                Scanning core: Wi-Fi, BLE, sensors, recording, mock data
  wifi-scanner/        Native Android module (Kotlin) for Wi-Fi scans
```

| Area | Folder | What lives there |
| --- | --- | --- |
| Core | `packages/core`, `packages/wifi-scanner` | Scanners, permissions, data recording, signal processing, native code |
| UI | `apps/mobile` | Screens, components, styling, navigation |

### The contract

The UI talks to the core **only** through `@campus/core` (`packages/core/src/index.ts`):

```tsx
import { useScanSnapshot, useScanner } from '@campus/core';

const { wifi, ble, sensors, recorder, mode } = useScanSnapshot(); // live data, re-renders ~3x per second
const scanner = useScanner(); // actions: startRecording, stopRecording, listRecordings, restartBleScan, ...
```

- All data shapes are in [`packages/core/src/types.ts`](packages/core/src/types.ts). Start there.
- Deep imports like `@campus/core/src/device/...` are blocked by the package `exports` field.
- Changing `types.ts` affects both sides: agree on it first, then change it in one commit.

## Getting started

Requirements: Node 20+, Git. For the real scanner also JDK 17 and the Android SDK.

```bash
npm install          # always from the repository root
```

### UI work with mock data (no Android build needed)

1. Install **Expo Go** on your phone.
2. Run:
   ```bash
   npm run mobile:mock
   ```
3. Scan the QR code with Expo Go.

The core detects Expo Go and switches to mock mode automatically. You get realistic fake Wi-Fi networks, BLE devices and beacons, and sensor values. The header shows `MOCK DATA`. All screens and recording actions work the same way as with the real scanner.

### Real scanning (Android phone over USB)

```bash
npm run mobile:android
```

This builds a development build with the native modules, installs it on the connected phone and starts Metro. The first build takes about 10 minutes.

To force a mode, set `EXPO_PUBLIC_SCANNER_MODE=mock` or `EXPO_PUBLIC_SCANNER_MODE=device` in `apps/mobile/.env.local`.

## Checks

```bash
npm run typecheck    # all workspaces
```

## Platform notes

- **iOS** does not allow third-party apps to scan Wi-Fi. On iOS only BLE and sensors will work.
- **Android** limits Wi-Fi scans to about 4 per 2 minutes. For testing, disable it in Settings → Developer options → Wi-Fi scan throttling.
- Wi-Fi and BLE scanning on Android require location permission and location services turned on.
