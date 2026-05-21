import { View, Text, StyleSheet } from 'react-native';

export default function CollectionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Colección</Text>
      <Text style={styles.subtitle}>Tus cartas y barajas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
  },
});
