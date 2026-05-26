import { useRouter } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

const splashImage = require('../assets/images/Portada_1.jpg');

export default function SplashScreen() {
  const router = useRouter();

  return (
    <Pressable style={styles.root} onPress={() => router.replace('/auth')}>
      <View style={styles.header}>
        <Text style={styles.title}>INAZUMA ELEVEN CARDS</Text>
      </View>

      <ImageBackground source={splashImage} style={styles.image} resizeMode="cover" />

      <View style={styles.footer}>
        <Text style={styles.hint}>Toca para empezar</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1565C0',
    letterSpacing: 1,
    textAlign: 'center',
  },
  image: {
    flex: 1,
    width: '100%',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    letterSpacing: 0.5,
  },
});
