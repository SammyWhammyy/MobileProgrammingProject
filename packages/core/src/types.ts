/**
 * Public contract between the scanning core and the UI.
 * The UI must depend only on what is exported from `@campus/core`.
 * Changing these types is a breaking change for the UI: coordinate before editing.
 */

export type ScannerMode = 'device' | 'mock';

export type WifiAccessPoint = {
  bssid: string;
  ssid: string;
  /** dBm */
  rssi: number;
  /** MHz */
  frequency: number;
  channelWidth: number;
  capabilities: string;
  wifiStandard: number | null;
  /** Supports Wi-Fi RTT (802.11mc) ranging. */
  is80211mcResponder: boolean;
  /** How old the OS scan result is, at the moment it was delivered. */
  ageMs: number;
};

export type WifiSnapshot = {
  /** False on platforms where apps cannot scan Wi-Fi (iOS). */
  supported: boolean;
  wifiEnabled: boolean | null;
  locationEnabled: boolean | null;
  /** Android limits foreground apps to ~4 scans per 2 minutes when this is on. */
  scanThrottleEnabled: boolean | null;
  /** Sorted by RSSI, strongest first. */
  accessPoints: WifiAccessPoint[];
  scanRequests: number;
  /** Scan requests rejected by the OS, usually due to throttling. */
  rejectedRequests: number;
  resultBatches: number;
  lastResultsAt: number | null;
  error: string | null;
};

export type BeaconInfo =
  | { kind: 'iBeacon'; uuid: string; major: number; minor: number; txPower: number }
  | { kind: 'Eddystone-UID'; namespace: string; instance: string; txPower: number }
  | { kind: 'Eddystone-URL'; url: string; txPower: number }
  | { kind: 'Eddystone-TLM' };

export type BleDevice = {
  /** MAC address on Android, random UUID on iOS. */
  id: string;
  name: string | null;
  /** dBm, latest advertisement */
  rssi: number;
  txPowerLevel: number | null;
  serviceUUIDs: string[];
  beacon: BeaconInfo | null;
  firstSeen: number;
  lastSeen: number;
  advertisements: number;
};

export type BleSnapshot = {
  adapterState: 'Unknown' | 'Resetting' | 'Unsupported' | 'Unauthorized' | 'PoweredOff' | 'PoweredOn';
  scanning: boolean;
  /** Every device seen this session, sorted by RSSI. Filter by `lastSeen` for "currently visible". */
  devices: BleDevice[];
  totalAdvertisements: number;
  error: string | null;
};

export type Vector3 = { x: number; y: number; z: number };

export type SensorName = 'magnetometer' | 'accelerometer' | 'gyroscope' | 'barometer' | 'light' | 'orientation';

export type SensorsSnapshot = {
  /** null = still checking. */
  available: Record<SensorName, boolean | null>;
  /** µT */
  magnetometer: Vector3 | null;
  /** g */
  accelerometer: Vector3 | null;
  /** rad/s */
  gyroscope: Vector3 | null;
  /** hPa */
  barometer: { pressure: number } | null;
  /** lx */
  light: { illuminance: number } | null;
  /** Degrees. */
  orientation: { alpha: number; beta: number; gamma: number } | null;
};

export type RecorderSnapshot = {
  active: boolean;
  label: string;
  fileName: string | null;
  startedAt: number | null;
  /** null = records until stopRecording(). */
  stopAt: number | null;
  /** Number of recorded samples per signal type. */
  counts: Record<string, number>;
};

export type PermissionsSnapshot = {
  requested: boolean;
  allGranted: boolean;
  denied: string[];
};

export type ScanSnapshot = {
  mode: ScannerMode;
  takenAt: number;
  permissions: PermissionsSnapshot;
  wifi: WifiSnapshot;
  ble: BleSnapshot;
  sensors: SensorsSnapshot;
  recorder: RecorderSnapshot;
};

export type Recording = {
  name: string;
  uri: string;
  size: number;
};

export interface Scanner {
  readonly mode: ScannerMode;
  /** Requests permissions and starts every available scanner. Safe to call again to retry permissions. */
  start(): Promise<void>;
  stop(): void;

  /** Immutable; a new object is published a few times per second while scanning. */
  getSnapshot(): ScanSnapshot;
  subscribe(listener: () => void): () => void;

  restartBleScan(): void;

  /** durationMs = null records until stopRecording(). */
  startRecording(label: string, durationMs: number | null): void;
  stopRecording(): void;
  listRecordings(): Recording[];
  shareRecording(uri: string): Promise<void>;
  deleteRecording(uri: string): void;
}
