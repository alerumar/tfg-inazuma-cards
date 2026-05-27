import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

export default function NotificationsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.title}>Notificaciones</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.center}>
        <Ionicons name="notifications-outline" size={56} color={Colors.primaryLight} />
        <Text style={styles.soon}>Sin notificaciones</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  soon:    { fontSize: 16, color: Colors.textLight },
});
