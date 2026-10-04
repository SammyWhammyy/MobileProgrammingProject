import {
  Accelerometer,
  Barometer,
  DeviceMotion,
  Gyroscope,
  LightSensor,
  Magnetometer,
} from 'expo-sensors';

import type { SensorName, SensorsSnapshot, Vector3 as Vector } from '../types';
import { record } from './recorder';

export const sensorsState: SensorsSnapshot = {
  available: {
    magnetometer: null,
    accelerometer: null,
    gyroscope: null,
    barometer: null,
    light: null,
    orientation: null,
  },
  magnetometer: null,
  accelerometer: null,
  gyroscope: null,
  barometer: null,
  light: null,
  orientation: null,
};

const RAD_TO_DEG = 180 / Math.PI;
let subscriptions: { remove(): void }[] = [];

type AnySensor = {
  isAvailableAsync(): Promise<boolean>;
  setUpdateInterval(ms: number): void;
  addListener(listener: (data: any) => void): { remove(): void };
};

async function attach(name: SensorName, sensor: AnySensor, intervalMs: number, onData: (data: any) => void) {
  const available = await sensor.isAvailableAsync().catch(() => false);
  sensorsState.available[name] = available;
  if (!available) return;
  sensor.setUpdateInterval(intervalMs);
  subscriptions.push(sensor.addListener(onData));
}

export async function startSensors(intervalMs: number) {
  if (subscriptions.length > 0) return;

  const vector =
    (name: 'magnetometer' | 'accelerometer' | 'gyroscope') =>
    ({ x, y, z }: Vector) => {
      sensorsState[name] = { x, y, z };
      record(name, { x, y, z });
    };

  await Promise.all([
    attach('magnetometer', Magnetometer, intervalMs, vector('magnetometer')),
    attach('accelerometer', Accelerometer, intervalMs, vector('accelerometer')),
    attach('gyroscope', Gyroscope, intervalMs, vector('gyroscope')),
    attach('barometer', Barometer, intervalMs, ({ pressure }) => {
      sensorsState.barometer = { pressure };
      record('barometer', { pressure });
    }),
    attach('light', LightSensor, intervalMs, ({ illuminance }) => {
      sensorsState.light = { illuminance };
      record('light', { illuminance });
    }),
    attach('orientation', DeviceMotion, intervalMs, ({ rotation }) => {
      if (!rotation) return;
      const orientation = {
        alpha: rotation.alpha * RAD_TO_DEG,
        beta: rotation.beta * RAD_TO_DEG,
        gamma: rotation.gamma * RAD_TO_DEG,
      };
      sensorsState.orientation = orientation;
      record('orientation', orientation);
    }),
  ]);
}

export function stopSensors() {
  subscriptions.forEach((s) => s.remove());
  subscriptions = [];
}
