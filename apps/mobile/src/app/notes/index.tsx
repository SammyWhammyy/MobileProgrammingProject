import type { RoomNote } from '@campus/map';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useMapBundle } from '../../data/MapDataProvider';
import { getNotesRepository } from '../../data/notes';
import { NoteButton, NoteCard, NotesLoading, NotesPage, noteStyles as styles } from '../../ui/NoteComponents';

/** Reload from SQLite whenever the editor returns to this screen. */
export default function NotesScreen() {
  const { snapshot } = useMapBundle();
  const roomIds = useMemo(() => snapshot.rooms.map((room) => room.id), [snapshot]);
  const [notes, setNotes] = useState<RoomNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const reload = useCallback(() => {
    const request = ++generation.current;
    setLoading(true); setError(false);
    getNotesRepository(roomIds).then((repo) => repo.list()).then(
      (value) => { if (request === generation.current) { setNotes(value); setLoading(false); } },
      (reason: unknown) => {
        console.error('Unable to read room notes', reason);
        if (request === generation.current) { setError(true); setLoading(false); }
      },
    );
  }, [roomIds]);
  useFocusEffect(useCallback(() => {
    reload();
    return () => { generation.current++; };
  }, [reload]));

  return <NotesPage title="Room notes" subtitle="Your notes stay on this device, including after restarting the app."
    onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
    action={<NoteButton title="New note" onPress={() => router.push('/notes/edit')} />}>
    {loading ? <NotesLoading /> : error ? <View style={styles.content}>
      <Text accessibilityRole="alert" style={styles.error}>Unable to load notes. Your saved notes have not been removed.</Text>
      <NoteButton title="Try again" onPress={reload} />
    </View> : <FlatList data={notes} keyExtractor={(note) => String(note.id)} contentContainerStyle={styles.content}
      ListEmptyComponent={<View style={{ gap: 12 }}><Text style={styles.label}>No room notes yet</Text>
        <Text style={styles.hint}>Add a reminder about equipment, a meeting, or something to bring to a room.</Text>
        <NoteButton title="Create your first note" onPress={() => router.push('/notes/edit')} /></View>}
      renderItem={({ item }) => {
        const room = snapshot.rooms.find((value) => value.id === item.roomId);
        const floor = snapshot.floors.find((value) => value.id === room?.floorId);
        return <NoteCard note={item} roomLabel={room ? `${room.code} · ${floor?.name ?? 'Building C'}` : 'Room no longer in current map'}
          onPress={() => router.push({ pathname: '/notes/edit', params: { id: String(item.id) } })} />;
      }} />}
  </NotesPage>;
}
