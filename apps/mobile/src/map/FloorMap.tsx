import { PLAN_ROOM_COLOR, PLAN_WALL_COLOR, type Floor, type Route, type Snapshot } from '@campus/map';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, SvgXml, Text as SvgText } from 'react-native-svg';

import { colors } from '../ui/kit';

const MIN_SCALE = 0.5;
const MAX_SCALE = 6;
const ROUTE_WIDTH_PX = 5;
const MARKER_RADIUS_PX = 7;

export const mapColors = {
  wall: '#D6D6D6',
  room: '#26272A',
  label: colors.muted,
  route: colors.accent,
  start: colors.accent,
  goal: colors.good,
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Replaces the two plan colors used in source SVGs with the current theme colors. */
function themePlan(xml: string) {
  return xml
    .replace(new RegExp(PLAN_WALL_COLOR, 'gi'), mapColors.wall)
    .replace(new RegExp(PLAN_ROOM_COLOR, 'gi'), mapColors.room);
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export interface FloorMapProps {
  snapshot: Snapshot;
  floor: Floor;
  svg: string;
  route?: Route | null;
  startNodeId?: string;
  goalNodeId?: string;
  /** Changing this value resets zoom and pan to fit the whole floor. */
  fitKey?: unknown;
  /** Inspect a step without implying live user location. */
  focusNodeId?: string;
}

/**
 * One floor plan with room labels and the route drawn on top.
 * Pinch to zoom (0.5x–6x) around the fingers, drag with inertia, double tap to zoom in 2x.
 */
export function FloorMap({ snapshot, floor, svg, route, startNodeId, goalNodeId, fitKey, focusNodeId }: FloorMapProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const pxPerM = size.w > 0 ? Math.min(size.w / floor.widthM, size.h / floor.heightM) * 0.95 : 0;
  const contentW = floor.widthM * pxPerM;
  const contentH = floor.heightM * pxPerM;

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  const pinching = useSharedValue(false);

  useEffect(() => {
    const point = snapshot.nodes.find((node) => node.id === focusNodeId && node.floorId === floor.id);
    const zoom = point ? 2 : 1;
    scale.value = withTiming(zoom, { duration: 250 });
    tx.value = withTiming(point ? (floor.widthM / 2 - point.x) * pxPerM * zoom : 0, { duration: 250 });
    ty.value = withTiming(point ? (floor.heightM / 2 - point.y) * pxPerM * zoom : 0, { duration: 250 });
  }, [fitKey, focusNodeId, snapshot, floor.id, floor.widthM, floor.heightM, pxPerM, scale, tx, ty]);

  const gesture = useMemo(() => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const limitX = (s: number) => {
      'worklet';
      return (contentW * s) / 2;
    };
    const limitY = (s: number) => {
      'worklet';
      return (contentH * s) / 2;
    };

    const pinch = Gesture.Pinch()
      .onStart((e) => {
        pinching.value = true;
        savedScale.value = scale.value;
        savedTx.value = tx.value;
        savedTy.value = ty.value;
        startFocalX.value = e.focalX - cx;
        startFocalY.value = e.focalY - cy;
      })
      .onUpdate((e) => {
        const s = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
        const k = s / savedScale.value;
        scale.value = s;
        tx.value = clamp(e.focalX - cx - k * (startFocalX.value - savedTx.value), -limitX(s), limitX(s));
        ty.value = clamp(e.focalY - cy - k * (startFocalY.value - savedTy.value), -limitY(s), limitY(s));
      })
      .onFinalize(() => {
        pinching.value = false;
      });

    const pan = Gesture.Pan()
      .maxPointers(1)
      .onChange((e) => {
        if (pinching.value) return;
        tx.value = clamp(tx.value + e.changeX, -limitX(scale.value), limitX(scale.value));
        ty.value = clamp(ty.value + e.changeY, -limitY(scale.value), limitY(scale.value));
      })
      .onEnd((e, success) => {
        if (!success || pinching.value) return;
        const s = scale.value;
        tx.value = withDecay({ velocity: e.velocityX, clamp: [-limitX(s), limitX(s)] });
        ty.value = withDecay({ velocity: e.velocityY, clamp: [-limitY(s), limitY(s)] });
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((e) => {
        const s0 = scale.value;
        if (s0 >= MAX_SCALE - 0.01) {
          scale.value = withTiming(1, { duration: 250 });
          tx.value = withTiming(0, { duration: 250 });
          ty.value = withTiming(0, { duration: 250 });
          return;
        }
        const s1 = Math.min(MAX_SCALE, s0 * 2);
        const k = s1 / s0;
        const fx = e.x - cx;
        const fy = e.y - cy;
        scale.value = withTiming(s1, { duration: 250 });
        tx.value = withTiming(clamp(fx - k * (fx - tx.value), -limitX(s1), limitX(s1)), { duration: 250 });
        ty.value = withTiming(clamp(fy - k * (fy - ty.value), -limitY(s1), limitY(s1)), { duration: 250 });
      });

    return Gesture.Simultaneous(pinch, pan, doubleTap);
  }, [size, contentW, contentH, scale, tx, ty, savedScale, savedTx, savedTy, startFocalX, startFocalY, pinching]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  // Route and markers keep a constant on-screen size at any zoom.
  const routeProps = useAnimatedProps(() => ({ strokeWidth: ROUTE_WIDTH_PX / (pxPerM * scale.value || 1) }), [pxPerM]);
  const markerProps = useAnimatedProps(() => {
    const pxToM = 1 / (pxPerM * scale.value || 1);
    return { r: MARKER_RADIUS_PX * pxToM, strokeWidth: 2 * pxToM };
  }, [pxPerM]);

  const plan = useMemo(() => themePlan(svg), [svg]);
  const nodes = useMemo(() => new Map(snapshot.nodes.map((n) => [n.id, n])), [snapshot]);
  const rooms = useMemo(() => snapshot.rooms.filter((r) => r.floorId === floor.id && r.labelAt), [snapshot, floor.id]);

  const routeD = useMemo(() => {
    if (!route) return '';
    return route.segments
      .filter((s) => s.floorId === floor.id && s.nodeIds.length > 1)
      .map((s) =>
        s.nodeIds
          .map((id, i) => {
            const n = nodes.get(id)!;
            return `${i === 0 ? 'M' : 'L'}${n.x} ${n.y}`;
          })
          .join(' '),
      )
      .join(' ');
  }, [route, floor.id, nodes]);

  const start = startNodeId ? nodes.get(startNodeId) : undefined;
  const goal = goalNodeId ? nodes.get(goalNodeId) : undefined;
  // An intermediate floor may contain only a landing between two stair edges.
  // Mark transfer endpoints even when there is no horizontal line to draw.
  const transfers = route ? [...new Set(route.segments
    .filter((segment) => segment.floorId === floor.id)
    .flatMap((segment) => [segment.nodeIds[0], segment.nodeIds.at(-1)]))]
    .map((id) => id ? nodes.get(id) : undefined)
    .filter((node) => node && (node.type === 'stairs' || node.type === 'elevator')) : [];
  const viewBox = `0 0 ${floor.widthM} ${floor.heightM}`;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container} onLayout={onLayout} collapsable={false}>
        {pxPerM > 0 ? (
          <Animated.View
            style={[
              styles.content,
              { width: contentW, height: contentH, left: (size.w - contentW) / 2, top: (size.h - contentH) / 2 },
              contentStyle,
            ]}
          >
            <SvgXml xml={plan} width={contentW} height={contentH} />
            <Svg width={contentW} height={contentH} viewBox={viewBox} style={StyleSheet.absoluteFill}>
              {rooms.map((r) => (
                <SvgText
                  key={r.id}
                  x={r.labelAt!.x}
                  y={r.labelAt!.y}
                  fill={mapColors.label}
                  fontSize={r.labelSize ?? floor.widthM / (r.code.length > 5 ? 55 : 40)}
                  fontWeight="600"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {r.code}
                </SvgText>
              ))}
              {routeD ? (
                <AnimatedPath
                  d={routeD}
                  stroke={mapColors.route}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animatedProps={routeProps}
                />
              ) : null}
              {transfers.map((node) => node && (
                <AnimatedCircle key={node.id} cx={node.x} cy={node.y}
                  fill={colors.card} stroke={mapColors.route} animatedProps={markerProps} />
              ))}
              {start && start.floorId === floor.id ? (
                <AnimatedCircle
                  cx={start.x}
                  cy={start.y}
                  fill={mapColors.start}
                  stroke="#fff"
                  animatedProps={markerProps}
                />
              ) : null}
              {goal && goal.floorId === floor.id ? (
                <AnimatedCircle cx={goal.x} cy={goal.y} fill={mapColors.goal} stroke="#fff" animatedProps={markerProps} />
              ) : null}
            </Svg>
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: colors.bg },
  content: { position: 'absolute' },
});
