import { listPlaces, NOTE_BODY_LIMIT, NOTE_TITLE_LIMIT, type NoteInput } from '@campus/map';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMapBundle } from '../../data/MapDataProvider';
import { getNotesRepository } from '../../data/notes';
import { PlacePicker } from '../../map/PlacePicker';
import { NoteButton, NotesLoading, NotesPage, noteStyles as styles } from '../../ui/NoteComponents';
import { colors } from '../../ui/kit';

const blank: NoteInput = { roomId: '', title: '', body: '' };

/** A separate route reads the complete record and provides Create, Update and Delete. */
export default function NoteEditor() {
  const { id: param } = useLocalSearchParams<{ id?: string | string[] }>();
  const editing = param !== undefined;
  const id = typeof param === 'string' && /^[1-9]\d*$/.test(param) ? Number(param) : NaN;
  const { snapshot } = useMapBundle();
  const roomIds = useMemo(() => snapshot.rooms.map((room) => room.id), [snapshot]);
  const places = useMemo(() => listPlaces(snapshot).filter((place) => place.roomId), [snapshot]);
  const [draft, setDraft] = useState<NoteInput>(blank);
  const [original, setOriginal] = useState<NoteInput>(blank);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const locked = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const room = snapshot.rooms.find((value) => value.id === draft.roomId);
  const leave = useCallback(() => router.canGoBack() ? router.back() : router.replace('/notes'), []);
  const requestBack = useCallback(() => {
    if (locked.current) return;
    if (!dirty) { leave(); return; }
    Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  }, [dirty, leave]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { requestBack(); return true; });
    return () => subscription.remove();
  }, [requestBack]));

  useEffect(() => {
    let active = true;
    (async () => {
      if (editing && !Number.isSafeInteger(id)) throw new Error('Invalid note link. Return to the notes list.');
      const repo = await getNotesRepository(roomIds);
      const note = editing ? await repo.get(id) : null;
      if (editing && !note) throw new Error('This note no longer exists. Return to the notes list.');
      const value = note ? { roomId: note.roomId, title: note.title, body: note.body } : blank;
      if (active) { setDraft(value); setOriginal(value); setReady(true); }
    })().catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : 'Unable to open this note. Try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editing, id, roomIds, attempt]);

  async function mutate(remove = false) {
    if (!ready || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const repo = await getNotesRepository(roomIds);
      if (remove) await repo.remove(id);
      else if (editing) await repo.update(id, draft);
      else await repo.create(draft);
      leave();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to save changes. Please try again.');
    } finally { locked.current = false; setBusy(false); }
  }

  function confirmDelete() {
    if (locked.current) return;
    Alert.alert('Delete this note?', 'This removes the note from this device.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void mutate(true); } },
    ]);
  }

  return <NotesPage title={editing ? 'Edit room note' : 'New room note'} subtitle="A reminder linked to a room in Building C."
    onBack={requestBack} action={<NoteButton title={busy ? 'Saving…' : 'Save'} disabled={!ready || busy} onPress={() => { void mutate(); }} />}>
    {loading ? <NotesLoading /> : loadError ? <View style={styles.content}>
      <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
      <NoteButton title="Try again" onPress={() => {
        setLoading(true); setReady(false); setLoadError(''); setAttempt((value) => value + 1);
      }} />
    </View> : <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View><Text style={styles.label}>Room</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Room: ${room?.code ?? 'Choose room'}`} disabled={busy}
            onPress={() => setPicking(true)} style={styles.input}>
            <Text style={{ color: room ? colors.text : colors.muted, fontSize: 16 }}>{room ? `${room.code} · ${room.name}` : 'Choose room'}</Text>
          </Pressable>
          {!!draft.roomId && !room && <Text style={styles.hint}>This room is unavailable. Choose another room before saving.</Text>}
        </View>
        <View><Text style={styles.label}>Title</Text>
          <TextInput accessibilityLabel="Note title" value={draft.title} editable={!busy} maxLength={NOTE_TITLE_LIMIT}
            onChangeText={(title) => setDraft((value) => ({ ...value, title }))} placeholder="For example: Bring an HDMI adapter"
            placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.hint}>{draft.title.length}/{NOTE_TITLE_LIMIT}</Text>
        </View>
        <View><Text style={styles.label}>Note</Text>
          <TextInput accessibilityLabel="Note text" value={draft.body} editable={!busy} multiline maxLength={NOTE_BODY_LIMIT}
            onChangeText={(body) => setDraft((value) => ({ ...value, body }))} placeholder="What would you like to remember?"
            placeholderTextColor={colors.muted} textAlignVertical="top" style={[styles.input, { minHeight: 170 }]} />
          <Text style={styles.hint}>{draft.body.length}/{NOTE_BODY_LIMIT}</Text>
        </View>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Text style={styles.hint}>Notes stay on this device. Updating the floor maps does not erase them.</Text>
        {editing && <NoteButton title="Delete note" danger disabled={busy} onPress={confirmDelete} />}
      </ScrollView>
    </KeyboardAvoidingView>}
    <PlacePicker visible={picking} title="Choose a room for your note" snapshot={snapshot} places={places}
      onClose={() => setPicking(false)} onPick={(place) => {
        setDraft((value) => ({ ...value, roomId: place.roomId! })); setPicking(false);
      }} />
  </NotesPage>;
}
