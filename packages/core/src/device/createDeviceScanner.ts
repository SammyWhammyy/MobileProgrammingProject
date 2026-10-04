import { createSnapshotStore } from '../snapshotStore';
import type { PermissionsSnapshot, ScanSnapshot, Scanner } from '../types';
import { bleState, restartBleScan, startBle, stopBle } from './ble';
import { requestScanPermissions } from './permissions';
import {
  deleteRecording,
  listRecordings,
  recorderState,
  shareRecording,
  startRecording,
  stopRecording,
} from './recorder';
import { sensorsState, startSensors, stopSensors } from './sensors';
import { startWifi, stopWifi, wifiState } from './wifi';

const WIFI_SCAN_INTERVAL_MS = 5_000;
const SENSOR_INTERVAL_MS = 100;
const PUBLISH_INTERVAL_MS = 300;

export function createDeviceScanner(): Scanner {
  let permissions: PermissionsSnapshot = { requested: false, allGranted: false, denied: [] };

  const build = (): ScanSnapshot => ({
    mode: 'device',
    takenAt: Date.now(),
    permissions,
    wifi: {
      supported: wifiState.supported,
      wifiEnabled: wifiState.status?.wifiEnabled ?? null,
      locationEnabled: wifiState.status?.locationEnabled ?? null,
      scanThrottleEnabled: wifiState.status?.scanThrottleEnabled ?? null,
      accessPoints: wifiState.accessPoints,
      scanRequests: wifiState.scanRequests,
      rejectedRequests: wifiState.rejectedRequests,
      resultBatches: wifiState.resultBatches,
      lastResultsAt: wifiState.lastResultsAt,
      error: wifiState.error,
    },
    ble: {
      adapterState: bleState.adapterState,
      scanning: bleState.scanning,
      devices: [...bleState.devices.values()].sort((a, b) => b.rssi - a.rssi),
      totalAdvertisements: bleState.totalAdvertisements,
      error: bleState.error,
    },
    sensors: { ...sensorsState, available: { ...sensorsState.available } },
    recorder: { ...recorderState, counts: { ...recorderState.counts } },
  });

  const store = createSnapshotStore(build, PUBLISH_INTERVAL_MS);

  return {
    mode: 'device',
    async start() {
      const result = await requestScanPermissions();
      permissions = { requested: true, ...result };
      startSensors(SENSOR_INTERVAL_MS);
      if (result.allGranted) {
        startWifi(WIFI_SCAN_INTERVAL_MS);
        startBle();
      }
      store.start();
      store.publish();
    },
    stop() {
      stopWifi();
      stopBle();
      stopSensors();
      stopRecording();
      store.stop();
    },
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    restartBleScan,
    startRecording(label, durationMs) {
      startRecording(label, durationMs);
      store.publish();
    },
    stopRecording() {
      stopRecording();
      store.publish();
    },
    listRecordings,
    shareRecording,
    deleteRecording,
  };
}
