import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RoomNote } from '@campus/map';
import { colors } from './kit';

export function NoteButton({ title, onPress, disabled = false, danger = false }: {
  title: string; onPress: () => void; disabled?: boolean; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.button, { opacity: disabled ? 0.4 : pressed ? 0.65 : 1 }]}>
    <Text style={[styles.buttonText, danger && { color: colors.bad }]}>{title}</Text>
  </Pressable>;
}

export function NotesPage({ title, subtitle, onBack, action, children }: {
  title: string; subtitle: string; onBack: () => void; action?: ReactNode; children: ReactNode;
}) {
  return <SafeAreaView edges={['top', 'bottom']} style={styles.page}>
    <View style={styles.header}>
      <NoteButton title="Back" onPress={onBack} />
      {action}
    </View>
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
    {children}
  </SafeAreaView>;
}

/** Reusable note preview. The full persisted text opens in the editor. */
export function NoteCard({ note, roomLabel, onPress }: { note: RoomNote; roomLabel: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open note: ${note.title}, ${roomLabel}`}
    onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
    <Text style={styles.room}>{roomLabel}</Text>
    <Text style={styles.noteTitle} numberOfLines={2}>{note.title}</Text>
    <Text style={styles.body} numberOfLines={3}>{note.body}</Text>
    <Text style={styles.date}>Updated {new Date(note.updatedAt).toLocaleDateString()}</Text>
  </Pressable>;
}

export function NotesLoading() {
  return <View style={styles.state}><ActivityIndicator color={colors.accent} /><Text style={styles.subtitle}>Opening room notes…</Text></View>;
}

export const noteStyles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  label: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  input: { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, minHeight: 52 },
  error: { color: colors.bad, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  heading: { padding: 16, gap: 6 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  button: { minHeight: 46, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card },
  buttonText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  room: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  noteTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  date: { color: colors.muted, fontSize: 12, marginTop: 4 },
  state: { padding: 24, gap: 14, alignItems: 'center' },
});
