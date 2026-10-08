import { describeStep, hamkC2, listPlaces, planRoute, type Place, type RouteMode } from '@campus/map';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FloorMap } from '../map/FloorMap';
import { PlacePicker } from '../map/PlacePicker';
import { colors, styles as kit } from '../ui/kit';

const bundle = hamkC2;
const WALKING_SPEED_M_PER_S = 1.3;

export function MapScreen() {
  const { snapshot, svgByFloor } = bundle;
  const places = useMemo(() => listPlaces(snapshot), [snapshot]);

  const [from, setFrom] = useState<Place | undefined>(() => places.find((p) => p.kind === 'entrance'));
  const [to, setTo] = useState<Place | undefined>();
  const [mode, setMode] = useState<RouteMode>('fastest');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [floorId, setFloorId] = useState(snapshot.floors[0].id);

  const route = useMemo(
    () => (from && to && from.nodeId !== to.nodeId ? planRoute(snapshot, from.nodeId, to.nodeId, mode) : null),
    [snapshot, from, to, mode],
  );
  const floor = snapshot.floors.find((f) => f.id === floorId)!;
  const routeFloors = new Set(route?.segments.map((s) => s.floorId));

  const pick = (place: Place) => {
    if (picking === 'from') setFrom(place);
    else setTo(place);
    const start = picking === 'from' ? place : from;
    if (start) setFloorId(start.floorId);
    setPicking(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.planner}>
        <View style={{ flex: 1, gap: 6 }}>
          <PlaceField label="From" place={from} onPress={() => setPicking('from')} />
          <PlaceField label="To" place={to} placeholder="Where to?" onPress={() => setPicking('to')} />
        </View>
        <Pressable
          style={styles.swap}
          accessibilityLabel="Swap start and destination"
          onPress={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          <Text style={styles.swapText}>⇅</Text>
        </Pressable>
      </View>

      <View style={styles.modes}>
        <Chip title="Fastest" active={mode === 'fastest'} onPress={() => setMode('fastest')} />
        <Chip title="No stairs" active={mode === 'accessible'} onPress={() => setMode('accessible')} />
        {snapshot.floors.length > 1
          ? snapshot.floors.map((f) => (
              <Chip
                key={f.id}
                title={`${f.level}${routeFloors.has(f.id) ? ' •' : ''}`}
                active={f.id === floorId}
                onPress={() => setFloorId(f.id)}
              />
            ))
          : null}
      </View>

      <FloorMap
        snapshot={snapshot}
        floor={floor}
        svg={svgByFloor[floor.id]}
        route={route}
        startNodeId={from?.nodeId}
        goalNodeId={to?.nodeId}
        fitKey={route}
      />

      <RoutePanel
        hasEnds={!!from && !!to}
        same={!!from && !!to && from.nodeId === to.nodeId}
        mode={mode}
        lengthM={route?.lengthM}
        steps={route?.steps.map((s) => describeStep(s, to?.title)) ?? []}
        onShowWithStairs={() => setMode('fastest')}
      />

      <PlacePicker
        visible={picking !== null}
        title={picking === 'from' ? 'Start point' : 'Destination'}
        snapshot={snapshot}
        places={places}
        onPick={pick}
        onClose={() => setPicking(null)}
      />
    </View>
  );
}

function PlaceField({
  label,
  place,
  placeholder,
  onPress,
}: {
  label: string;
  place?: Place;
  placeholder?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.field, { opacity: pressed ? 0.7 : 1 }]} onPress={onPress}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, !place && { color: colors.muted }]} numberOfLines={1}>
        {place ? `${place.title} · ${place.subtitle}` : (placeholder ?? 'Choose')}
      </Text>
    </Pressable>
  );
}

function Chip({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{title}</Text>
    </Pressable>
  );
}

function RoutePanel({
  hasEnds,
  same,
  mode,
  lengthM,
  steps,
  onShowWithStairs,
}: {
  hasEnds: boolean;
  same: boolean;
  mode: RouteMode;
  lengthM?: number;
  steps: string[];
  onShowWithStairs: () => void;
}) {
  if (!hasEnds) {
    return (
      <View style={styles.panel}>
        <Text style={kit.muted}>Choose a destination to build a route.</Text>
      </View>
    );
  }
  if (same) {
    return (
      <View style={styles.panel}>
        <Text style={kit.muted}>Start and destination are the same place.</Text>
      </View>
    );
  }
  if (lengthM === undefined) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          {mode === 'accessible' ? 'No route without stairs' : 'No route found'}
        </Text>
        {mode === 'accessible' ? (
          <Pressable onPress={onShowWithStairs}>
            <Text style={{ color: colors.accent, marginTop: 4 }}>Show route with stairs</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  const minutes = Math.max(1, Math.round(lengthM / WALKING_SPEED_M_PER_S / 60));
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>
        {Math.round(lengthM)} m · about {minutes} min
      </Text>
      <ScrollView style={{ maxHeight: 140 }}>
        {steps.map((s, i) => (
          <Text key={i} style={styles.step}>
            {i + 1}. {s}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  planner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  field: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fieldLabel: { color: colors.muted, fontSize: 11 },
  fieldValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  swap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  swapText: { color: colors.text, fontSize: 20 },
  modes: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  panel: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  panelTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  step: { color: colors.text, fontSize: 14, paddingVertical: 2 },
});
