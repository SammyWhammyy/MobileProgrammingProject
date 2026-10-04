import { useScanSnapshot, type WifiAccessPoint } from '@campus/core';
import { FlatList, View } from 'react-native';

import { Card, colors, formatAge, Mono, Muted, Row, rssiColor, SignalBar, styles } from '../ui/kit';

function band(freq: number) {
  if (freq >= 5925) return '6 GHz';
  if (freq >= 4900) return '5 GHz';
  return '2.4 GHz';
}

function AccessPoint({ ap }: { ap: WifiAccessPoint }) {
  return (
    <View style={styles.listItem}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Mono style={{ flex: 1, fontWeight: '600' }}>{ap.ssid || '<hidden network>'}</Mono>
        <Mono style={{ color: rssiColor(ap.rssi) }}>{ap.rssi} dBm</Mono>
      </View>
      <SignalBar rssi={ap.rssi} />
      <Muted>
        {ap.bssid} · {ap.frequency} MHz ({band(ap.frequency)}) · {formatAge(ap.ageMs)}
        {ap.is80211mcResponder ? ' · RTT' : ''}
      </Muted>
    </View>
  );
}

export function WifiScreen() {
  const { wifi: s, takenAt } = useScanSnapshot();

  if (!s.supported) {
    return (
      <View style={{ padding: 12 }}>
        <Card title="Wi-Fi">
          <Muted>Wi-Fi scanning is not available on this platform (iOS does not give apps this access).</Muted>
        </Card>
      </View>
    );
  }

  const header = (
    <Card title={`Access points: ${s.accessPoints.length}`}>
      <Row
        label="Wi-Fi enabled"
        value={s.wifiEnabled ? 'yes' : 'no'}
        color={s.wifiEnabled ? colors.good : colors.bad}
      />
      <Row
        label="Location enabled"
        value={s.locationEnabled ? 'yes' : 'no'}
        color={s.locationEnabled ? colors.good : colors.bad}
      />
      <Row
        label="Scan throttling"
        value={s.scanThrottleEnabled === null ? '—' : s.scanThrottleEnabled ? 'on' : 'off'}
        color={s.scanThrottleEnabled ? colors.warn : colors.good}
      />
      <Row label="Last results" value={s.lastResultsAt ? formatAge(takenAt - s.lastResultsAt) : '—'} />
      <Row label="Requests / rejected by OS" value={`${s.scanRequests} / ${s.rejectedRequests}`} />
      <Row label="Result batches received" value={s.resultBatches} />
      {s.scanThrottleEnabled ? (
        <Muted>
          Android allows about 4 scans per 2 minutes. For testing, turn it off: Settings → Developer options →
          Wi-Fi scan throttling.
        </Muted>
      ) : null}
      {s.error ? <Mono style={{ color: colors.bad }}>{s.error}</Mono> : null}
    </Card>
  );

  return (
    <FlatList
      contentContainerStyle={{ padding: 12 }}
      data={s.accessPoints}
      keyExtractor={(ap) => ap.bssid}
      ListHeaderComponent={header}
      renderItem={({ item }) => <AccessPoint ap={item} />}
      ListEmptyComponent={<Muted>Nothing found yet.</Muted>}
    />
  );
}
