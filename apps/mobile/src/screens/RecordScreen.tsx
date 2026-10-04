import { useScanner, useScanSnapshot, type Recording } from '@campus/core';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, colors, Mono, Muted, Row, styles } from '../ui/kit';

const DURATIONS: { label: string; ms: number | null }[] = [
  { label: '30 s', ms: 30_000 },
  { label: '60 s', ms: 60_000 },
  { label: '∞', ms: null },
];

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

export function RecordScreen() {
  const [label, setLabel] = useState('');
  const [duration, setDuration] = useState<number | null>(30_000);
  const [files, setFiles] = useState<Recording[]>([]);
  const scanner = useScanner();
  const { recorder: r, takenAt: now } = useScanSnapshot();

  const refresh = useCallback(() => setFiles(scanner.listRecordings()), [scanner]);
  useEffect(refresh, [refresh, r.active]);

  const onStart = () => {
    if (!label.trim()) {
      Alert.alert('Location label', 'Enter where you are standing, e.g. "Room 214, by the window".');
      return;
    }
    scanner.startRecording(label.trim(), duration);
  };

  const onDelete = (f: Recording) =>
    Alert.alert('Delete recording?', f.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          scanner.deleteRecording(f.uri);
          refresh();
        },
      },
    ]);

  const elapsed = r.startedAt ? Math.round((now - r.startedAt) / 1000) : 0;
  const left = r.stopAt ? Math.max(0, Math.round((r.stopAt - now) / 1000)) : null;

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      <Card title="Fingerprint recording">
        <Muted>
          Stand at a spot, enter its name and start recording. All signals (Wi-Fi, BLE, sensors) are written to a
          JSONL file with this label.
        </Muted>
        <TextInput
          style={local.input}
          placeholder="Room 214, by the window"
          placeholderTextColor={colors.muted}
          value={label}
          onChangeText={setLabel}
          editable={!r.active}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {DURATIONS.map((d) => (
            <Button
              key={d.label}
              title={d.label}
              kind={duration === d.ms ? 'primary' : 'ghost'}
              onPress={() => setDuration(d.ms)}
              disabled={r.active}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        {r.active ? (
          <Button title="Stop" kind="danger" onPress={scanner.stopRecording} />
        ) : (
          <Button title="Start recording" onPress={onStart} />
        )}
      </Card>

      {r.active ? (
        <Card title={`Recording: ${r.label}`}>
          <Row label="Elapsed" value={`${elapsed} s`} />
          {left !== null ? <Row label="Remaining" value={`${left} s`} /> : null}
          {Object.entries(r.counts).map(([type, n]) => (
            <Row key={type} label={type} value={n} />
          ))}
        </Card>
      ) : null}

      <Card title={`Files: ${files.length}`} right={<Button title="Refresh" kind="ghost" onPress={refresh} />}>
        {files.length === 0 ? <Muted>No recordings yet.</Muted> : null}
        {files.map((f) => (
          <View key={f.uri} style={styles.listItem}>
            <Mono style={{ fontSize: 12 }}>{f.name}</Mono>
            <Muted>{formatSize(f.size)}</Muted>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Button title="Share" kind="ghost" onPress={() => scanner.shareRecording(f.uri)} style={{ flex: 1 }} />
              <Button title="Delete" kind="ghost" onPress={() => onDelete(f)} style={{ flex: 1 }} />
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const local = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 10,
  },
});
