import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapScreen } from '../screens/MapScreen';
import { colors } from '../ui/kit';
import { router } from 'expo-router';
import { NoteButton } from '../ui/NoteComponents';

/** Map-first MVP home screen. Start selection is always manual. */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
        <Text style={styles.title}>Campus Navigator</Text>
        <Text style={styles.subtitle}>Building C · Offline navigation</Text>
        </View>
        <NoteButton title="Room notes" onPress={() => router.push('/notes')} />
      </View>
      <MapScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: colors.text, fontSize: 23, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
});
