import { isRunningInExpoGo } from 'expo';

import { createMockScanner } from './mock/createMockScanner';
import type { Scanner, ScannerMode } from './types';

/** Expo Go has no custom native modules, so the real scanner cannot run there. */
export function defaultScannerMode(): ScannerMode {
  return isRunningInExpoGo() ? 'mock' : 'device';
}

export function createScanner(mode: ScannerMode = defaultScannerMode()): Scanner {
  if (mode === 'mock') return createMockScanner();
  // Lazy require keeps native-only modules (BLE, Wi-Fi) from loading in mock mode.
  const { createDeviceScanner } = require('./device/createDeviceScanner') as typeof import('./device/createDeviceScanner');
  return createDeviceScanner();
}
