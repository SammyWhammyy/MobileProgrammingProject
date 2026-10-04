import { NativeModule, requireOptionalNativeModule } from 'expo';

export type WifiAccessPoint = {
  bssid: string;
  ssid: string;
  rssi: number;
  frequency: number;
  channelWidth: number;
  centerFreq0: number;
  centerFreq1: number;
  capabilities: string;
  wifiStandard: number | null;
  is80211mcResponder: boolean;
  ageMs: number;
  seenAt: number;
};

export type WifiStatus = {
  wifiEnabled: boolean;
  locationEnabled: boolean;
  scanThrottleEnabled: boolean | null;
  rttSupported: boolean;
  sdkInt: number;
};

type Events = {
  onScanResults: (event: { updated: boolean; results: WifiAccessPoint[] }) => void;
};

declare class WifiScannerModule extends NativeModule<Events> {
  startScan(): boolean;
  getScanResults(): WifiAccessPoint[];
  getStatus(): WifiStatus;
}

// null on iOS/web: third-party apps cannot scan Wi-Fi there.
export default requireOptionalNativeModule<WifiScannerModule>('WifiScanner');
