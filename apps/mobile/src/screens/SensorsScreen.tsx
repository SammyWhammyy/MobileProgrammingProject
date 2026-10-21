import { useScanSnapshot, type SensorName } from '@campus/core';
import { ScrollView } from 'react-native';

import { Card, Muted, Row } from '../ui/kit';

const f = (n: number | undefined, digits = 2) => (n === undefined ? '—' : n.toFixed(digits));

// International standard atmosphere, relative to sea level pressure.
const altitudeFromPressure = (hPa: number) => 44330 * (1 - Math.pow(hPa / 1013.25, 1 / 5.255));

function Unavailable({ available }: { available: boolean | null }) {
  if (available === null) return <Muted>Checking sensor…</Muted>;
  if (!available) return <Muted>This device has no such sensor</Muted>;
  return <Muted>Waiting for data…</Muted>;
}

export function SensorsScreen() {
  const { sensors } = useScanSnapshot();
  const { magnetometer: m, accelerometer: a, gyroscope: g, barometer: b, light, orientation: o } = sensors;
  const missing = (name: SensorName) => <Unavailable available={sensors.available[name]} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Card title="Magnetic field, µT">
        {m ? (
          <>
            <Row label="X" value={f(m.x)} />
            <Row label="Y" value={f(m.y)} />
            <Row label="Z" value={f(m.z)} />
            <Row label="|B|" value={f(Math.hypot(m.x, m.y, m.z))} />
          </>
        ) : (
          missing('magnetometer')
        )}
      </Card>

      <Card title="Barometer">
        {b ? (
          <>
            <Row label="Pressure, hPa" value={f(b.pressure, 3)} />
            <Row label="Altitude (estimate), m" value={f(altitudeFromPressure(b.pressure), 1)} />
          </>
        ) : (
          missing('barometer')
        )}
      </Card>

      <Card title="Orientation, °">
        {o ? (
          <>
            <Row label="alpha (around Z)" value={f(o.alpha, 1)} />
            <Row label="beta (around X)" value={f(o.beta, 1)} />
            <Row label="gamma (around Y)" value={f(o.gamma, 1)} />
          </>
        ) : (
          missing('orientation')
        )}
      </Card>

      <Card title="Accelerometer, g">
        {a ? (
          <>
            <Row label="X" value={f(a.x, 3)} />
            <Row label="Y" value={f(a.y, 3)} />
            <Row label="Z" value={f(a.z, 3)} />
          </>
        ) : (
          missing('accelerometer')
        )}
      </Card>

      <Card title="Gyroscope, rad/s">
        {g ? (
          <>
            <Row label="X" value={f(g.x, 3)} />
            <Row label="Y" value={f(g.y, 3)} />
            <Row label="Z" value={f(g.z, 3)} />
          </>
        ) : (
          missing('gyroscope')
        )}
      </Card>

      <Card title="Illuminance, lx">
        {light ? <Row label="Lux" value={f(light.illuminance, 0)} /> : missing('light')}
      </Card>
    </ScrollView>
  );
}
