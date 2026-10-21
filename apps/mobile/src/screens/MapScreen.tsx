import { describeStep, listPlaces, planRoute, type Place } from '@campus/map';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMapBundle } from '../data/MapDataProvider';
import { FloorMap } from '../map/FloorMap';
import { PlacePicker } from '../map/PlacePicker';
import { colors } from '../ui/kit';

/** Offline planner. Selecting a step inspects it; it never tracks the user. */
export function MapScreen() {
  const { snapshot, svgByFloor } = useMapBundle();
  const places = useMemo(() => listPlaces(snapshot), [snapshot]);
  const [from, setFrom] = useState<Place>();
  const [to, setTo] = useState<Place>();
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [floorId, setFloorId] = useState(snapshot.floors[0].id);
  const [focus, setFocus] = useState<string>();
  const [fit, setFit] = useState(0);
  const [selectedStep, setSelectedStep] = useState<number>();
  const [directionsExpanded, setDirectionsExpanded] = useState(false);
  const same = !!from && !!to && from.nodeId === to.nodeId;
  const route = useMemo(() => from && to && from.nodeId !== to.nodeId
    ? planRoute(snapshot, from.nodeId, to.nodeId) : null, [snapshot, from, to]);
  const floor = snapshot.floors.find((item) => item.id === floorId) ?? snapshot.floors[0];
  const routeFloors = new Set(route?.segments.map((segment) => segment.floorId));
  const resetView = () => { setFocus(undefined); setFit((value) => value + 1); };
  const clearGuidance = () => { setSelectedStep(undefined); setDirectionsExpanded(false); resetView(); };

  return (
    <View style={styles.root}>
      <View style={styles.planner}>
        <View style={{ flex: 1, gap: 8 }}>
          <PlaceField label="From" place={from} onPress={() => setPicking('from')} />
          <PlaceField label="To" place={to} onPress={() => setPicking('to')} />
        </View>
        <View style={{ gap: 8 }}>
          <Action title="Swap" disabled={!from && !to} onPress={() => {
            setFrom(to); setTo(from); if (to) setFloorId(to.floorId); clearGuidance();
          }} />
          <Action title="Clear" disabled={!from && !to} onPress={() => {
            setFrom(undefined); setTo(undefined); clearGuidance();
          }} />
        </View>
      </View>
      <View style={styles.floorRow}>
        {snapshot.floors.map((item) => (
          <Pressable key={item.id} accessibilityRole="button"
            accessibilityLabel={`${item.name}${routeFloors.has(item.id) ? ', on route' : ''}`}
            accessibilityState={{ selected: item.id === floor.id }}
            onPress={() => { setFloorId(item.id); setSelectedStep(undefined); resetView(); }}
            style={[styles.floor, item.id === floor.id && styles.floorActive]}>
            <Text style={[styles.floorText, item.id === floor.id && { color: colors.text }]}>
              {item.name}{routeFloors.has(item.id) ? ' •' : ''}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.mapAndPanel}>
      <View style={styles.mapArea}>
        <FloorMap snapshot={snapshot} floor={floor} svg={svgByFloor[floor.id]}
          route={route} startNodeId={from?.nodeId} goalNodeId={to?.nodeId}
          fitKey={fit} focusNodeId={focus} />
        <View style={styles.reset}><Action title="Fit map" onPress={resetView} /></View>
      </View>
      <View style={[styles.panel, route && directionsExpanded && styles.panelExpanded]}>
        {!from || !to ? <Text style={styles.message}>Choose your starting place and destination.</Text>
          : same ? <Text style={styles.message}>You selected the same place. Choose another destination.</Text>
          : !route ? <Text style={styles.message}>No route found. Try another starting place or destination.</Text>
          : <>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: directionsExpanded }}
              accessibilityLabel={directionsExpanded ? 'Hide directions' : 'Show directions'}
              onPress={() => setDirectionsExpanded((expanded) => !expanded)} style={styles.panelToggle}>
              <View style={styles.handle} />
              <View style={styles.panelHeading}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.routeTitle} numberOfLines={1}>{from.title} → {to.title}</Text>
                  <Text style={styles.hint}>{routeFloors.size} {routeFloors.size === 1 ? 'floor' : 'floors'} · {route.steps.length} steps</Text>
                </View>
                <Text style={styles.actionText}>{directionsExpanded ? 'Hide steps ▾' : 'Show steps ▴'}</Text>
              </View>
            </Pressable>
            {directionsExpanded && <ScrollView style={styles.steps} contentContainerStyle={{ paddingVertical: 4 }}>
              {route.steps.map((step, index) => (
                <Pressable key={index} accessibilityRole="button"
                  accessibilityState={{ selected: selectedStep === index }}
                  onPress={() => {
                    setSelectedStep(index); setFloorId(step.floorId); setFocus(step.nodeId); setFit((value) => value + 1);
                  }} style={[styles.step, index === selectedStep && styles.stepActive]}>
                  <Text style={styles.stepText}>{index + 1}. {step.kind === 'straight' ? 'Follow the highlighted corridor' : describeStep(step, to.title)}</Text>
                  {step.kind === 'changeFloor' && <Action title={`Open floor ${step.toLevel}`} onPress={() => {
                    setFloorId(step.toFloorId); resetView();
                  }} />}
                </Pressable>
              ))}
            </ScrollView>}
          </>}
      </View>
      </View>
      <PlacePicker visible={picking !== null} title={picking === 'from' ? 'Choose your starting place' : 'Choose destination'}
        snapshot={snapshot} places={places} onClose={() => setPicking(null)} onPick={(place) => {
          if (picking === 'from') { setFrom(place); setFloorId(place.floorId); }
          else { setTo(place); setFloorId(from?.floorId ?? place.floorId); }
          setPicking(null); clearGuidance();
        }} />
    </View>
  );
}

function PlaceField({ label, place, onPress }: { label: string; place?: Place; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${place?.title ?? 'Choose place'}`}
    onPress={onPress} style={styles.field}>
    <Text style={styles.hint}>{label}</Text>
    <Text style={styles.fieldValue} numberOfLines={1}>{place ? `${place.title} · ${place.subtitle}` : 'Choose place'}</Text>
  </Pressable>;
}

function Action({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={(event) => { event.stopPropagation(); onPress(); }} style={[styles.action, disabled && { opacity: 0.4 }]}>
    <Text style={styles.actionText}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapAndPanel: { flex: 1 },
  mapArea: { flex: 1, minHeight: 110 },
  planner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  field: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, minHeight: 58 },
  hint: { color: colors.muted, fontSize: 12 },
  fieldValue: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 3 },
  action: { minHeight: 44, minWidth: 60, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  actionText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  floorRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  floor: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  floorActive: { backgroundColor: colors.card, borderColor: colors.accent },
  floorText: { color: colors.muted, fontWeight: '600' },
  reset: { position: 'absolute', bottom: 10, right: 16 },
  panel: { backgroundColor: colors.card, padding: 14, gap: 7, borderTopWidth: 1, borderTopColor: colors.border },
  panelExpanded: { height: '58%' },
  panelToggle: { minHeight: 52, gap: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.muted, alignSelf: 'center' },
  panelHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  message: { color: colors.text, fontSize: 14, paddingVertical: 8 },
  routeTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  steps: { flex: 1 },
  step: { minHeight: 44, justifyContent: 'center', padding: 9, borderRadius: 8, gap: 8 },
  stepActive: { backgroundColor: colors.bg },
  stepText: { color: colors.text, fontSize: 14, lineHeight: 20 },
});
