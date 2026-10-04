import { describeBeacon, useScanner, useScanSnapshot, type BleDevice } from '@campus/core';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { Button, Card, colors, formatAge, Mono, Muted, Row, rssiColor, SignalBar, styles } from '../ui/kit';

const VISIBLE_WINDOW_MS = 15_000;

function DeviceItem({ d, now }: { d: BleDevice; now: number }) {
  return (
    <View style={styles.listItem}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Mono style={{ flex: 1, fontWeight: '600' }}>{d.name ?? '<unnamed>'}</Mono>
        <Mono style={{ color: rssiColor(d.rssi) }}>{d.rssi} dBm</Mono>
      </View>
      <SignalBar rssi={d.rssi} />
      <Muted>
        {d.id} · packets {d.advertisements} · {formatAge(now - d.lastSeen)}
        {d.txPowerLevel !== null ? ` · tx ${d.txPowerLevel}` : ''}
      </Muted>
      {d.beacon ? <Mono style={{ color: colors.accent, fontSize: 12 }}>{describeBeacon(d.beacon)}</Mono> : null}
    </View>
  );
}

export function BleScreen() {
  const [beaconsOnly, setBeaconsOnly] = useState(false);
  const scanner = useScanner();
  const { ble: bleState, takenAt: now } = useScanSnapshot();
  const all = bleState.devices;
  const visible = all
    .filter((d) => now - d.lastSeen < VISIBLE_WINDOW_MS)
    .filter((d) => !beaconsOnly || d.beacon !== null);
  const beaconCount = all.filter((d) => d.beacon !== null && now - d.lastSeen < VISIBLE_WINDOW_MS).length;

  const header = (
    <Card title={`Bluetooth LE: ${visible.length}`}>
      <Row
        label="Adapter"
        value={bleState.adapterState}
        color={bleState.adapterState === 'PoweredOn' ? colors.good : colors.bad}
      />
      <Row
        label="Scanning"
        value={bleState.scanning ? 'running' : 'stopped'}
        color={bleState.scanning ? colors.good : colors.warn}
      />
      <Row label="Beacons (iBeacon/Eddystone)" value={beaconCount} />
      <Row label="Devices this session" value={all.length} />
      <Row label="Total packets" value={bleState.totalAdvertisements} />
      <Muted>Showing devices seen in the last {VISIBLE_WINDOW_MS / 1000} s.</Muted>
      {bleState.error ? <Mono style={{ color: colors.bad }}>{bleState.error}</Mono> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button
          title={beaconsOnly ? 'Show all' : 'Beacons only'}
          kind="ghost"
          onPress={() => setBeaconsOnly((v) => !v)}
          style={{ flex: 1 }}
        />
        <Button title="Restart scan" kind="ghost" onPress={scanner.restartBleScan} style={{ flex: 1 }} />
      </View>
    </Card>
  );

  return (
    <FlatList
      contentContainerStyle={{ padding: 12 }}
      data={visible}
      keyExtractor={(d) => d.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => <DeviceItem d={item} now={now} />}
      ListEmptyComponent={<Muted>Nothing found yet.</Muted>}
    />
  );
}
