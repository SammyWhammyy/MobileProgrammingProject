import { ScannerProvider, useScanner, useScanSnapshot, type ScannerMode } from '@campus/core';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BleScreen } from './src/screens/BleScreen';
import { MapScreen } from './src/screens/MapScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { SensorsScreen } from './src/screens/SensorsScreen';
import { WifiScreen } from './src/screens/WifiScreen';
import { Button, Card, colors, Muted } from './src/ui/kit';

const TABS = [
  { key: 'map', title: 'Map', Screen: MapScreen },
  { key: 'wifi', title: 'Wi-Fi', Screen: WifiScreen },
  { key: 'ble', title: 'BLE', Screen: BleScreen },
  { key: 'sensors', title: 'Sensors', Screen: SensorsScreen },
  { key: 'record', title: 'Record', Screen: RecordScreen },
] as const;

// Unset = automatic: mock data in Expo Go, real scanning in a development build.
const SCANNER_MODE = process.env.EXPO_PUBLIC_SCANNER_MODE as ScannerMode | undefined;

function Shell() {
  const scanner = useScanner();
  const { mode, permissions, recorder } = useScanSnapshot();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('map');
  const Screen = TABS.find((t) => t.key === tab)!.Screen;

  return (
    <SafeAreaView style={local.root} edges={['top', 'bottom']}>
      <View style={local.header}>
        <Text style={local.title}>Campus Navigator</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {mode === 'mock' ? <Text style={local.mock}>MOCK DATA</Text> : null}
          {recorder.active ? <Text style={local.rec}>● REC</Text> : null}
        </View>
      </View>

      {tab !== 'map' && permissions.requested && !permissions.allGranted ? (
        <View style={{ paddingHorizontal: 12 }}>
          <Card title="Missing permissions">
            <Muted>
              Wi-Fi and Bluetooth scanning need these permissions: {permissions.denied.join(', ')}. If the system no
              longer asks, grant them manually in the app settings.
            </Muted>
            <Button title="Request again" onPress={() => scanner.start()} style={{ marginTop: 8 }} />
          </Card>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <Screen />
      </View>

      <View style={local.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={local.tab} onPress={() => setTab(t.key)}>
            <Text style={[local.tabText, tab === t.key && local.tabActive]}>{t.title}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ScannerProvider mode={SCANNER_MODE}>
          <Shell />
        </ScannerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const local = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  mock: { color: colors.warn, fontWeight: '700' },
  rec: { color: colors.bad, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { color: colors.muted, fontWeight: '600' },
  tabActive: { color: colors.accent },
});
