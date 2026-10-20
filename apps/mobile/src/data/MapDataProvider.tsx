import { buildingC, loadStoredMap, type MapBundle } from '@campus/map';
import { openDatabaseAsync } from 'expo-sqlite';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors } from '../ui/kit';

const MapDataContext = createContext<MapBundle | null>(null);

/** Stable UI boundary; persistence can change without changing map components. */
export function MapDataProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<MapBundle | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getLocalMap().then(
      (value) => { if (!cancelled) setBundle(value); },
      (reason: unknown) => {
        console.error('Unable to load local map', reason);
        if (!cancelled) setError(true);
      },
    );
    return () => { cancelled = true; };
  }, [attempt]);
  if (!bundle) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24, gap: 16 }}>
        {!error && <ActivityIndicator color={colors.accent} accessibilityLabel="Loading local maps" />}
        <Text style={{ color: colors.text }}>{error ? 'Unable to open the local map database.' : 'Opening offline maps…'}</Text>
        {error && <Pressable accessibilityRole="button" onPress={() => { setError(false); setAttempt((value) => value + 1); }} style={{ padding: 16 }}><Text style={{ color: colors.accent }}>Try again</Text></Pressable>}
      </View>
    );
  }
  return <MapDataContext.Provider value={bundle}>{children}</MapDataContext.Provider>;
}

// Share initialization across React Strict Mode mounts; discard failed attempts.
let pending: Promise<MapBundle> | undefined;
function getLocalMap(): Promise<MapBundle> {
  return pending ??= (async () => {
    const db = await openDatabaseAsync('campus-navigator.db');
    try {
      return await loadStoredMap(db, buildingC);
    } finally {
      await db.closeAsync();
    }
  })().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
}

/** Returns the active local map bundle. */
export function useMapBundle(): MapBundle {
  const bundle = useContext(MapDataContext);
  if (!bundle) throw new Error('MapDataProvider is missing');
  return bundle;
}
