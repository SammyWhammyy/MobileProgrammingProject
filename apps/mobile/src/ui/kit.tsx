import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export const colors = {
  bg: '#0f1115',
  card: '#181b22',
  border: '#262a33',
  text: '#e8eaed',
  muted: '#8a8f98',
  accent: '#4f8cff',
  good: '#3ecf8e',
  warn: '#f5a524',
  bad: '#f05252',
};

export function formatAge(ms: number) {
  if (ms < 1000) return 'now';
  if (ms < 60_000) return `${Math.round(ms / 1000)} s ago`;
  return `${Math.round(ms / 60_000)} min ago`;
}

export function rssiColor(rssi: number) {
  if (rssi >= -60) return colors.good;
  if (rssi >= -75) return colors.warn;
  return colors.bad;
}

export function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Row({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.mono, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

export function Mono({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function SignalBar({ rssi }: { rssi: number }) {
  const pct = Math.max(0, Math.min(1, (rssi + 100) / 70));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: rssiColor(rssi) }]} />
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = kind === 'primary' ? colors.accent : kind === 'danger' ? colors.bad : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        kind === 'ghost' && styles.buttonGhost,
        style,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  label: { color: colors.muted, fontSize: 13 },
  mono: { color: colors.text, fontFamily: 'monospace', fontSize: 13 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  barTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: { height: 4 },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  buttonGhost: { borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#fff', fontWeight: '600' },
  listItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});
