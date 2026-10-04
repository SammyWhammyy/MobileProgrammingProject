import WifiScanner, { type WifiAccessPoint, type WifiStatus } from '@campus/wifi-scanner';
import { record } from './recorder';

export type WifiState = {
  supported: boolean;
  status: WifiStatus | null;
  accessPoints: WifiAccessPoint[];
  scanRequests: number;
  /** startScan() calls rejected by the OS, usually due to scan throttling. */
  rejectedRequests: number;
  resultBatches: number;
  lastResultsAt: number | null;
  error: string | null;
};

export const wifiState: WifiState = {
  supported: WifiScanner !== null,
  status: null,
  accessPoints: [],
  scanRequests: 0,
  rejectedRequests: 0,
  resultBatches: 0,
  lastResultsAt: null,
  error: null,
};

let subscription: { remove(): void } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function applyResults(results: WifiAccessPoint[], updated: boolean) {
  wifiState.accessPoints = [...results].sort((a, b) => b.rssi - a.rssi);
  wifiState.resultBatches++;
  wifiState.lastResultsAt = Date.now();
  record('wifi', {
    updated,
    aps: results.map((ap) => ({
      bssid: ap.bssid,
      ssid: ap.ssid,
      rssi: ap.rssi,
      freq: ap.frequency,
      ageMs: ap.ageMs,
    })),
  });
}

function requestScan() {
  if (!WifiScanner) return;
  try {
    wifiState.status = WifiScanner.getStatus();
    wifiState.scanRequests++;
    if (!WifiScanner.startScan()) wifiState.rejectedRequests++;
    wifiState.error = null;
  } catch (e) {
    wifiState.error = String(e);
  }
}

export function startWifi(intervalMs: number) {
  if (!WifiScanner || timer) return;
  subscription = WifiScanner.addListener('onScanResults', (e) => applyResults(e.results, e.updated));
  try {
    applyResults(WifiScanner.getScanResults(), false);
  } catch (e) {
    wifiState.error = String(e);
  }
  requestScan();
  timer = setInterval(requestScan, intervalMs);
}

export function stopWifi() {
  if (timer) clearInterval(timer);
  timer = null;
  subscription?.remove();
  subscription = null;
}
