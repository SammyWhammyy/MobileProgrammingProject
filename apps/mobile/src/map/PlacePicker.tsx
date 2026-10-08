import { searchPlaces, type Place, type Snapshot } from '@campus/map';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, colors, styles as kit } from '../ui/kit';

/** Full-screen list of places with search by room code, name and tags. */
export function PlacePicker({
  visible,
  title,
  snapshot,
  places,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  snapshot: Snapshot;
  places: Place[];
  onPick: (place: Place) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchPlaces(snapshot, places, query), [snapshot, places, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Button title="Close" kind="ghost" onPress={onClose} />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Room code, name or tag"
          placeholderTextColor={colors.muted}
          autoFocus
          autoCorrect={false}
          style={styles.input}
        />
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 12 }}
          ListEmptyComponent={<Text style={kit.muted}>Nothing found for "{query}"</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [kit.listItem, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => {
                setQuery('');
                onPick(item);
              }}
            >
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={kit.muted}>{item.subtitle}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  input: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 16,
  },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
