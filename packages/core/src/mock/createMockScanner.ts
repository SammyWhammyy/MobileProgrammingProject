import { createSnapshotStore } from '../snapshotStore';
import type {
  BleDevice,
  Recording,
  RecorderSnapshot,
  ScanSnapshot,
  Scanner,
  SensorsSnapshot,
  WifiAccessPoint,
  WifiSnapshot,
} from '../types';

/**
 * Fake data for UI development without a phone or native build (works in Expo Go).
 * Values drift over time so lists re-sort and numbers change like real scans.
 */

const PUBLISH_INTERVAL_MS = 300;
const WIFI_BATCH_INTERVAL_MS = 4_000;

const drift = (value: number, step: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value + (Math.random() * 2 - 1) * step));

const noise = (amplitude: number) => (Math.random() * 2 - 1) * amplitude;

const WIFI_SEED: [ssid: string, frequency: number, rssi: number][] = [
  ['Campus-WiFi', 2437, -48],
  ['Campus-WiFi', 5180, -55],
  ['Campus-Guest', 2412, -62],
  ['Campus-Guest', 5240, -67],
  ['eduroam', 2462, -58],
  ['eduroam', 5500, -71],
  ['Library-Staff', 5745, -76],
  ['Printer-3F', 2437, -80],
  ['', 5200, -84],
  ['Lab-214', 5300, -69],
  ['Cafeteria', 2412, -88],
  ['DIRECT-TV-Hall', 2462, -90],
];

const BLE_SEED: Omit<BleDevice, 'firstSeen' | 'lastSeen' | 'advertisements'>[] = [
  {
    id: 'C3:11:5A:20:01:01',
    name: 'Beacon-Entrance',
    rssi: -64,
    txPowerLevel: -59,
    serviceUUIDs: [],
    beacon: { kind: 'iBeacon', uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e', major: 1, minor: 101, txPower: -59 },
  },
  {
    id: 'C3:11:5A:20:01:02',
    name: 'Beacon-Room214',
    rssi: -72,
    txPowerLevel: -59,
    serviceUUIDs: [],
    beacon: { kind: 'iBeacon', uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e', major: 2, minor: 214, txPower: -59 },
  },
  {
    id: 'E1:42:9B:00:33:7A',
    name: null,
    rssi: -81,
    txPowerLevel: null,
    serviceUUIDs: ['0000feaa-0000-1000-8000-00805f9b34fb'],
    beacon: { kind: 'Eddystone-UID', namespace: 'edd1ebeac04e5defa017', instance: '0000000003f1', txPower: -20 },
  },
  { id: '5D:8A:01:9C:44:10', name: 'Galaxy Buds2', rssi: -58, txPowerLevel: null, serviceUUIDs: [], beacon: null },
  { id: '7F:20:3B:AA:12:9E', name: 'Mi Band 7', rssi: -77, txPowerLevel: null, serviceUUIDs: [], beacon: null },
  { id: '4A:1C:77:D0:8E:02', name: null, rssi: -85, txPowerLevel: null, serviceUUIDs: [], beacon: null },
  { id: '60:0B:E2:51:3F:C4', name: 'LE-Bose QC45', rssi: -90, txPowerLevel: null, serviceUUIDs: [], beacon: null },
];

export function createMockScanner(): Scanner {
  const startedAt = Date.now();

  let accessPoints: WifiAccessPoint[] = WIFI_SEED.map(([ssid, frequency, rssi], i) => ({
    bssid: `a4:2b:b0:1c:${(0x10 + i).toString(16)}:${(0x20 + i * 7).toString(16).padStart(2, '0')}`,
    ssid,
    rssi,
    frequency,
    channelWidth: frequency > 4900 ? 2 : 0,
    capabilities: ssid === 'Campus-Guest' ? '[ESS]' : '[WPA2-PSK-CCMP][RSN-PSK-CCMP][ESS]',
    wifiStandard: frequency > 4900 ? 5 : 4,
    is80211mcResponder: i === 0,
    ageMs: 0,
  }));

  const ble = new Map<string, BleDevice>(
    BLE_SEED.map((d) => [d.id, { ...d, firstSeen: startedAt, lastSeen: startedAt, advertisements: 0 }]),
  );
  let totalAdvertisements = 0;

  let wifiStats = { scanRequests: 0, rejectedRequests: 0, resultBatches: 0, lastResultsAt: null as number | null };

  const sensors: SensorsSnapshot = {
    available: {
      magnetometer: true,
      accelerometer: true,
      gyroscope: true,
      barometer: true,
      light: true,
      orientation: true,
    },
    magnetometer: { x: 12, y: -28, z: -35 },
    accelerometer: { x: 0, y: 0, z: 1 },
    gyroscope: { x: 0, y: 0, z: 0 },
    barometer: { pressure: 1003.2 },
    light: { illuminance: 320 },
    orientation: { alpha: 90, beta: 5, gamma: -2 },
  };

  let recorder: RecorderSnapshot = {
    active: false,
    label: '',
    fileName: null,
    startedAt: null,
    stopAt: null,
    counts: {},
  };
  let recordings: Recording[] = [
    { name: '20261002_101500_Room_214_window.jsonl', uri: 'mock://1', size: 184_320 },
    { name: '20261002_100900_Main_entrance.jsonl', uri: 'mock://2', size: 96_512 },
  ];

  let ticker: ReturnType<typeof setInterval> | null = null;
  let lastWifiBatch = 0;

  const count = (type: string, n = 1) => {
    if (recorder.active) recorder.counts = { ...recorder.counts, [type]: (recorder.counts[type] ?? 0) + n };
  };

  const stopRecording = () => {
    if (!recorder.active) return;
    const size = Object.values(recorder.counts).reduce((a, b) => a + b, 0) * 90;
    recordings = [{ name: recorder.fileName!, uri: `mock://${Date.now()}`, size }, ...recordings];
    recorder = { ...recorder, active: false, stopAt: null };
  };

  const tick = () => {
    const now = Date.now();

    if (now - lastWifiBatch >= WIFI_BATCH_INTERVAL_MS) {
      lastWifiBatch = now;
      accessPoints = accessPoints
        .map((ap) => ({ ...ap, rssi: Math.round(drift(ap.rssi, 3, -95, -35)), ageMs: Math.round(Math.random() * 800) }))
        .sort((a, b) => b.rssi - a.rssi);
      wifiStats = {
        scanRequests: wifiStats.scanRequests + 1,
        rejectedRequests: wifiStats.rejectedRequests + (Math.random() < 0.3 ? 1 : 0),
        resultBatches: wifiStats.resultBatches + 1,
        lastResultsAt: now,
      };
      count('wifi');
    }

    for (const d of ble.values()) {
      // Weak devices are occasionally missed, like in real scans.
      if (Math.random() < (d.rssi < -85 ? 0.4 : 0.9)) {
        const packets = 1 + Math.floor(Math.random() * 3);
        ble.set(d.id, {
          ...d,
          rssi: Math.round(drift(d.rssi, 2, -98, -40)),
          lastSeen: now,
          advertisements: d.advertisements + packets,
        });
        totalAdvertisements += packets;
        count('ble', packets);
      }
    }

    const m = sensors.magnetometer!;
    sensors.magnetometer = { x: drift(m.x, 0.4, -60, 60), y: drift(m.y, 0.4, -60, 60), z: drift(m.z, 0.4, -60, 60) };
    sensors.accelerometer = { x: noise(0.02), y: noise(0.02), z: 1 + noise(0.02) };
    sensors.gyroscope = { x: noise(0.01), y: noise(0.01), z: noise(0.01) };
    sensors.barometer = { pressure: 1003.2 + noise(0.05) };
    sensors.light = { illuminance: Math.round(drift(sensors.light!.illuminance, 8, 50, 900)) };
    const o = sensors.orientation!;
    sensors.orientation = { alpha: (o.alpha + noise(1) + 360) % 360, beta: drift(o.beta, 0.5, -10, 20), gamma: drift(o.gamma, 0.5, -10, 10) };
    for (const name of ['magnetometer', 'accelerometer', 'gyroscope', 'barometer', 'light', 'orientation']) count(name, 3);

    if (recorder.active && recorder.stopAt !== null && now >= recorder.stopAt) stopRecording();
  };

  const build = (): ScanSnapshot => {
    const wifi: WifiSnapshot = {
      supported: true,
      wifiEnabled: true,
      locationEnabled: true,
      scanThrottleEnabled: true,
      accessPoints,
      ...wifiStats,
      error: null,
    };
    return {
      mode: 'mock',
      takenAt: Date.now(),
      permissions: { requested: true, allGranted: true, denied: [] },
      wifi,
      ble: {
        adapterState: 'PoweredOn',
        scanning: ticker !== null,
        devices: [...ble.values()].sort((a, b) => b.rssi - a.rssi),
        totalAdvertisements,
        error: null,
      },
      sensors: { ...sensors },
      recorder,
    };
  };

  const store = createSnapshotStore(build, PUBLISH_INTERVAL_MS);

  return {
    mode: 'mock',
    async start() {
      if (!ticker) ticker = setInterval(tick, PUBLISH_INTERVAL_MS);
      tick();
      store.start();
      store.publish();
    },
    stop() {
      if (ticker) clearInterval(ticker);
      ticker = null;
      store.stop();
    },
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    restartBleScan() {},
    startRecording(label, durationMs) {
      const now = Date.now();
      recorder = {
        active: true,
        label,
        fileName: `${now}_${label.replace(/\W+/g, '_')}.jsonl`,
        startedAt: now,
        stopAt: durationMs === null ? null : now + durationMs,
        counts: { meta: 1 },
      };
      store.publish();
    },
    stopRecording() {
      stopRecording();
      store.publish();
    },
    listRecordings: () => recordings,
    async shareRecording(uri) {
      console.log(`[mock scanner] share ${uri}`);
    },
    deleteRecording(uri) {
      recordings = recordings.filter((r) => r.uri !== uri);
    },
  };
}
