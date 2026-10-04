import { BleManager, ScanCallbackType, ScanMode, State, type Device } from 'react-native-ble-plx';

import { parseBeacon } from '../beacon';
import type { BleDevice, BleSnapshot } from '../types';
import { record } from './recorder';

type BleState = {
  adapterState: BleSnapshot['adapterState'];
  scanning: boolean;
  devices: Map<string, BleDevice>;
  totalAdvertisements: number;
  error: string | null;
};

export const bleState: BleState = {
  adapterState: 'Unknown',
  scanning: false,
  devices: new Map(),
  totalAdvertisements: 0,
  error: null,
};

let manager: BleManager | null = null;
let stateSubscription: { remove(): void } | null = null;

function onAdvertisement(device: Device) {
  const now = Date.now();
  const beacon = parseBeacon(device.manufacturerData, device.serviceData);
  const prev = bleState.devices.get(device.id);
  const rssi = device.rssi ?? -127;

  bleState.devices.set(device.id, {
    id: device.id,
    name: device.name ?? device.localName ?? prev?.name ?? null,
    rssi,
    txPowerLevel: device.txPowerLevel,
    serviceUUIDs: device.serviceUUIDs ?? [],
    beacon: beacon ?? prev?.beacon ?? null,
    firstSeen: prev?.firstSeen ?? now,
    lastSeen: now,
    advertisements: (prev?.advertisements ?? 0) + 1,
  });
  bleState.totalAdvertisements++;

  record('ble', {
    id: device.id,
    name: device.name ?? device.localName,
    rssi,
    tx: device.txPowerLevel,
    beacon,
  });
}

function startScan() {
  if (!manager || bleState.scanning) return;
  bleState.scanning = true;
  bleState.error = null;
  manager
    .startDeviceScan(
      null,
      {
        allowDuplicates: true,
        scanMode: ScanMode.LowLatency,
        callbackType: ScanCallbackType.AllMatches,
        legacyScan: false,
      },
      (error, device) => {
        if (error) {
          bleState.error = error.message;
          bleState.scanning = false;
          return;
        }
        if (device) onAdvertisement(device);
      },
    )
    .catch((e) => {
      bleState.error = String(e);
      bleState.scanning = false;
    });
}

export function startBle() {
  if (manager) return;
  manager = new BleManager();
  stateSubscription = manager.onStateChange((state) => {
    bleState.adapterState = state as BleSnapshot['adapterState'];
    if (state === State.PoweredOn) {
      startScan();
    } else {
      bleState.scanning = false;
    }
  }, true);
}

/** Restarts the scan after an error or after Bluetooth was toggled. */
export function restartBleScan() {
  if (!manager) return;
  manager.stopDeviceScan().finally(() => {
    bleState.scanning = false;
    startScan();
  });
}

export function stopBle() {
  stateSubscription?.remove();
  stateSubscription = null;
  manager?.stopDeviceScan();
  manager?.destroy();
  manager = null;
  bleState.scanning = false;
}
